"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Terminal as TerminalIcon } from "lucide-react";

type Props = { labId: string; title: string };

export default function LabTerminal({ labId, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  
  // Track the authorized code from the magic link
  const [authorizedCode, setAuthorizedCode] = useState<string | null>(null);
  const [request, setRequest] = useState<{ code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Your practice space is ready.");

  // Magic Link Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");

    if (codeFromUrl) {
      window.localStorage.setItem("lab_access_code", codeFromUrl);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorizedCode(codeFromUrl);
      // Clean up the URL so it looks nice and the code is hidden
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedCode = window.localStorage.getItem("lab_access_code");
      if (savedCode) {
        setAuthorizedCode(savedCode);
      }
    }
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!request || !host) return;

    let disposed = false;
    const cleanup: Array<() => void> = [];

    async function start() {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
        ]);

        if (disposed) return;

        const terminal = new Terminal({
          cursorBlink: true,
          disableStdin: true,
          screenReaderMode: true,
          fontSize: 14,
          lineHeight: 1.25,
          fontFamily: '"SFMono-Regular", Consolas, monospace',
          scrollback: 2000,
          theme: {
            background: "#090f13",
            foreground: "#e1eadf",
            cursor: "#b8f777",
            selectionBackground: "#3a573d",
            green: "#b8f777",
            cyan: "#86d9dc",
            magenta: "#c4b5fd",
          },
        });

        cleanup.push(() => terminal.dispose());

        const fit = new FitAddon();
        terminal.loadAddon(fit);
        terminal.open(host!);
        fit.fit();

        const url = new URL(
          process.env.NEXT_PUBLIC_LAB_WS_URL || "/lab-socket",
          window.location.href,
        );

        if (url.protocol === "http:") url.protocol = "ws:";
        if (url.protocol === "https:") url.protocol = "wss:";
        if (
          !["ws:", "wss:"].includes(url.protocol) ||
          (window.location.protocol === "https:" && url.protocol !== "wss:")
        ) {
          throw new Error("The terminal requires a valid, secure gateway URL.");
        }

        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        let ready = false;
        let closeMessage = "Connection closed. Connect again when you are ready.";

        cleanup.push(() => {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.close();
        });

        function send(message: object) {
          if (!disposed && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
          }
        }

        const connectionTimer = window.setTimeout(() => {
          if (ready || disposed) return;
          closeMessage = "Connection timed out. Check that the gateway is running.";
          setStatus(closeMessage);
          socket.close();
        }, 30_000);

        cleanup.push(() => window.clearTimeout(connectionTimer));

        socket.onopen = () => {
          send({
            type: "auth",
            code: request!.code,
            labId,
            cols: terminal.cols,
            rows: terminal.rows,
          });
        };

        socket.onmessage = (event: MessageEvent) => {
          if (disposed) return;

          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);
            terminal.write(bytes, () => {
              send({ type: "ack", bytes: bytes.byteLength });
            });
            return;
          }

          try {
            const message = JSON.parse(event.data) as {
              type?: string;
              message?: string;
            };

            if (message.type === "ready") {
              ready = true;
              window.clearTimeout(connectionTimer);
              terminal.options.disableStdin = false;
              fit.fit();
              send({
                type: "resize",
                cols: terminal.cols,
                rows: terminal.rows,
              });
              setStatus("Connected. Your next discovery starts here.");
              terminal.focus();
            }

            if (
              message.type === "status" &&
              typeof message.message === "string"
            ) {
              closeMessage = message.message;
              setStatus(message.message);
            }
          } catch {
            closeMessage = "The gateway returned an invalid response.";
            socket.close();
          }
        };

        socket.onerror = () => {
          closeMessage = "Could not reach the gateway. Check its address and connection limits.";
          if (!disposed) setStatus(closeMessage);
        };

        socket.onclose = () => {
          window.clearTimeout(connectionTimer);
          ready = false;
          terminal.options.disableStdin = true;
          if (!disposed) {
            setBusy(false);
            setStatus(closeMessage);
          }
        };

        const input = terminal.onData((data) => {
          if (!ready) return;
          if (data.length > 4096) {
            setStatus("Please paste fewer than 4,096 characters at a time.");
            return;
          }
          send({ type: "input", data });
        });

        const resize = terminal.onResize(({ cols, rows }) => {
          if (ready) send({ type: "resize", cols, rows });
        });

        const observer = new ResizeObserver(() => {
          if (!disposed && host!.clientWidth > 0) fit.fit();
        });
        observer.observe(host!);

        cleanup.push(
          () => input.dispose(),
          () => resize.dispose(),
          () => observer.disconnect(),
        );
      } catch (error) {
        if (!disposed) {
          setBusy(false);
          setStatus(
            error instanceof Error ? error.message : "Could not start the terminal.",
          );
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      for (const dispose of cleanup.reverse()) dispose();
      host?.replaceChildren();
    };
  }, [request, labId]);

  function connect(event: FormEvent<HTMLFormElement> | React.MouseEvent) {
    if (event && "preventDefault" in event) event.preventDefault();
    if (!authorizedCode) {
      setStatus("No access code found. Please use the magic link provided.");
      return;
    }
    setBusy(true);
    setStatus("Opening your practice space...");
    setRequest({ code: authorizedCode.trim() });
  }

  function disconnect() {
    setRequest(null);
    setBusy(false);
    setStatus("Disconnected. Your files stay until the lab restarts or is reset.");
  }

  return (
    <div className="live-lab">
      <div className="panel-heading">
        <span className="icon-label">
          <TerminalIcon size={18} aria-hidden="true" />
          {title}
        </span>
        <span className="pill">PRACTICE LAB</span>
      </div>

      <div className="terminal-controls">
        <div className="terminal-code" style={{ padding: "11px 0" }}>
          <span>Lab Access Status</span>
          <div style={{ color: "var(--text)", fontSize: "13px" }}>
            {authorizedCode ? (
              <span style={{ color: "#b8f777" }}>✓ Authorized via Magic Link</span>
            ) : (
              <span style={{ color: "#ff8b8b" }}>Waiting for Magic Link authorization...</span>
            )}
          </div>
        </div>

        {busy ? (
          <button type="button" className="secondary-button" onClick={disconnect}>
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={connect}
            disabled={!authorizedCode}
          >
            Connect to lab
          </button>
        )}
      </div>

      <div className="terminal-window">
        <div
          ref={hostRef}
          className="terminal-screen"
          aria-label={`${title} interactive terminal`}
        />
        {!request && (
          <p className="terminal-empty">
            A little curiosity. A few commands. <br />
            Connect whenever you are ready.
          </p>
        )}
      </div>

      <p className="terminal-status" role="status">
        {status}
      </p>
    </div>
  );
}