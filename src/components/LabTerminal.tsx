"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { Terminal as TerminalIcon, Trophy } from "lucide-react";
import { getLabAccessCode } from "@/app/actions";
import "@/app/batch-two.css";

type Props = {
  labId: string;
  title: string;
  variant?: "lab" | "ctf";
};

export default function LabTerminal({ labId, title, variant = "lab" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [accessCode, setAccessCode] = useState<string | undefined>();
  const [request, setRequest] = useState<{ code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Your practice space is ready.");

  useEffect(() => {
    let disposed = false;
    getLabAccessCode()
      .then((code) => {
        if (disposed) return;
        setAccessCode(code);
        if (!code?.trim()) {
          setStatus("No lab access code is available.");
        }
      })
      .catch(() => {
        if (!disposed) {
          setStatus("Could not load lab access. Please refresh and try again.");
        }
      });
    return () => {
      disposed = true;
    };
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
              setConnected(true);
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
            setConnected(false);
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
          if (
            !disposed &&
            host!.clientWidth > 0 &&
            host!.clientHeight > 0
          ) {
            fit.fit();
          }
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
          setConnected(false);
          setStatus(
            error instanceof Error ? error.message : "Could not start the terminal.",
          );
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      for (const dispose of cleanup.reverse()) {
        dispose();
      }
      host.replaceChildren();
    };
  }, [request, labId]);

  function connect(
    event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    if (busy) return;
    if (!accessCode?.trim()) {
      setStatus("No access code found in environment variables.");
      return;
    }
    setBusy(true);
    setConnected(false);
    setStatus("Opening your practice space...");
    setRequest({ code: accessCode.trim() });
  }

  function disconnect() {
    setRequest(null);
    setBusy(false);
    setConnected(false);
    setStatus(
      "Disconnected. Your files stay until the lab restarts or is reset.",
    );
  }

  return (
    <div className="live-lab">
      <div className="panel-heading lab-terminal-heading">
        <div className="lab-terminal-title-group">
          <span className="lab-terminal-icon" aria-hidden="true">
            <TerminalIcon size={19} />
          </span>
          <div>
            <span className="lab-terminal-kicker">{variant === "ctf" ? "TARGET ENVIRONMENT" : "HANDS-ON PRACTICE"}</span>
            <strong className="lab-terminal-title">{title}</strong>
          </div>
        </div>

        <div className="lab-terminal-actions">
          {variant === "lab" && (<span className="lab-terminal-points"><Trophy size={13} aria-hidden="true" /> 50 XP<span className="lab-terminal-points-description"> - lab points</span></span>)}

          {busy ? (
            <button
              type="button"
              className="secondary-button"
              onClick={disconnect}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={connect}
              disabled={!accessCode?.trim()}
            >
              Connect to lab
            </button>
          )}
        </div>
      </div>

      <div className="terminal-window" style={{ overflow: "hidden" }}>
        <div
          ref={hostRef}
          className="terminal-screen"
          style={{ overflow: "hidden" }}
          aria-label={`${title} interactive terminal`}
        />
        {!request ? (
          <p className="terminal-empty">
            A little curiosity. A few commands. <br />
            Connect whenever you are ready.
          </p>
        ) : (
          !connected && (
            <p className="terminal-empty lab-terminal-overlay">
              {status === "Opening your practice space..." ? "Starting the machine..." : status}
            </p>
          )
        )}
      </div>

      <p
        className={`terminal-status lab-terminal-status${
          connected ? " is-connected" : ""
        }`}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true" />
        {status}
      </p>
    </div>
  );
}
