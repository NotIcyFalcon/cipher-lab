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
