// Minimal POSIX (ustar) tar writer, enough for Docker build contexts and for
// copying files into containers. No dependencies.

function octal(value, length) {
  // length includes the single trailing space/NUL terminator tar expects.
  return value.toString(8).padStart(length - 1, "0") + "\0";
}

function header(name, size, mode = 0o644, type = "0") {
  const buf = Buffer.alloc(512);

  if (Buffer.byteLength(name, "utf8") > 100) {
    throw new Error(`tar path too long: ${name}`);
  }

  buf.write(name, 0, 100, "utf8");
  buf.write(octal(mode & 0o7777, 8), 100, 8, "ascii");
  buf.write(octal(0, 8), 108, 8, "ascii"); // uid
  buf.write(octal(0, 8), 116, 8, "ascii"); // gid
  buf.write(octal(size, 12), 124, 12, "ascii");
  buf.write(octal(Math.floor(Date.now() / 1000), 12), 136, 12, "ascii");
  buf.write("        ", 148, 8, "ascii"); // checksum placeholder (spaces)
  buf.write(type, 156, 1, "ascii");
  buf.write("ustar\0", 257, 6, "ascii");
  buf.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += buf[i];
  buf.write(octal(checksum, 7), 148, 7, "ascii");
  buf.write(" ", 155, 1, "ascii");

  return buf;
}

function pad(size) {
  const remainder = size % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder);
}

function readString(buf, start, length) {
  const slice = buf.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

function readOctal(buf, start, length) {
  const text = readString(buf, start, length).trim();
  return text ? parseInt(text, 8) : 0;
}

function parsePax(body) {
  const fields = {};
  let offset = 0;
  const text = body.toString("utf8");

  while (offset < text.length) {
    const space = text.indexOf(" ", offset);
    if (space === -1) break;
    const length = Number(text.slice(offset, space));
    if (!Number.isFinite(length) || length <= 0) break;
    const record = text.slice(space + 1, offset + length - 1);
    const eq = record.indexOf("=");
    if (eq > 0) fields[record.slice(0, eq)] = record.slice(eq + 1);
    offset += length;
  }

  return fields;
}

/**
 * Parse a tar archive (ustar, with PAX and GNU long-name extensions as
 * produced by Docker's archive endpoint). Returns entries:
 *   { name, type: "file" | "dir" | "symlink" | "other", mode, size, linkname, content }
 */
export function readTar(buffer) {
  const entries = [];
  let offset = 0;
  let pending = {};

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const size = readOctal(header, 124, 12);
    const flag = String.fromCharCode(header[156] || 48);
    const bodyStart = offset + 512;
    const body = buffer.subarray(bodyStart, bodyStart + size);
    offset = bodyStart + Math.ceil(size / 512) * 512;

    if (flag === "x") {
      pending = { ...pending, ...parsePax(body) };
      continue;
    }
    if (flag === "g") continue;
    if (flag === "L") {
      pending.path = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (flag === "K") {
      pending.linkpath = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }

    const prefix = readString(header, 345, 155);
    let name = readString(header, 0, 100);
    if (prefix) name = `${prefix}/${name}`;
    if (pending.path) name = pending.path;

    const linkname = pending.linkpath || readString(header, 157, 100);
    pending = {};

    const type =
      flag === "0" || flag === "\0" || flag === "7"
        ? "file"
        : flag === "5"
          ? "dir"
          : flag === "2"
            ? "symlink"
            : "other";

    entries.push({
      name: name.replace(/^\.\//, "").replace(/\/$/, ""),
      type,
      mode: readOctal(header, 100, 8) & 0o7777,
      size,
      linkname,
      // A view into the archive buffer (no copy).
      content: type === "file" ? body : Buffer.alloc(0),
    });
  }

  return entries;
}

/**
 * Build a tar archive from entries: { name, content, mode?, type? }.
 * content is a string or Buffer. Returns a single Buffer.
 */
export function makeTar(entries) {
  const parts = [];

  for (const entry of entries) {
    const type = entry.type ?? "0";

    if (type === "5") {
      // directory
      parts.push(header(entry.name.endsWith("/") ? entry.name : entry.name + "/", 0, entry.mode ?? 0o755, "5"));
      continue;
    }

    const body = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? "", "utf8");

    parts.push(header(entry.name, body.length, entry.mode ?? 0o644, type));
    parts.push(body);
    parts.push(pad(body.length));
  }

  // Two zero blocks mark the end of the archive.
  parts.push(Buffer.alloc(1024));

  return Buffer.concat(parts);
}
