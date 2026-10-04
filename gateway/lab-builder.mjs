// Internal endpoints that build lab images (one per machine) and clean them up.
import { buildImage, pruneImages } from "./image-builder.mjs";
import { renderMachine } from "./lab-render.mjs";
import { HttpError, ndjson, readJson, sendJson } from "./internal-http.mjs";

export const LAB_IMAGE_PREFIX = "cyberbox-lab";

function safe(value, length) {
  return String(value).toLowerCase().replace(/[^a-z0-9_.-]/g, "-").slice(0, length);
}

/** Repository prefix shared by every image of one lab. */
export function labRepoPrefix(labId) {
  return `${LAB_IMAGE_PREFIX}-${safe(labId, 40)}-`;
}

export function imageTag(labId, machineKey, buildId) {
  return `${labRepoPrefix(labId)}${safe(machineKey, 24)}:b${buildId}`;
}

export async function handleBuildLab(req, res) {
  const job = await readJson(req);
  const { labId, buildId, recipe } = job ?? {};

  if (!labId || !buildId || !recipe || !Array.isArray(recipe.machines) || recipe.machines.length === 0) {
    throw new HttpError("Invalid build job.");
  }

  const stream = ndjson(res);

  try {
    const images = {};

    for (const machine of recipe.machines) {
      const tag = imageTag(labId, machine.key, buildId);
      stream.log(`\n=== Building machine "${machine.hostname}" ===\n`);

      let rendered;
      try {
        rendered = renderMachine(machine, recipe.policy);
      } catch (error) {
        stream.end({ type: "result", ok: false, error: `Could not prepare "${machine.hostname}": ${error.message}` });
        return;
      }

      const result = await buildImage({
        tag,
        baseImage: rendered.baseImage,
        files: rendered.files,
        provision: rendered.provision,
        entrypoint: rendered.entrypoint,
        labels: { "cyberbox.kind": "lab", "cyberbox.lab": String(labId), "cyberbox.build": String(buildId) },
        onLog: (text) => stream.log(text),
      });

      if (!result.ok) {
        // Drop the images this failed build already produced.
        await pruneImages(labRepoPrefix(labId), job.keepImages ?? []);
        stream.end({ type: "result", ok: false, error: `Build failed for "${machine.hostname}": ${result.error}` });
        return;
      }

      images[machine.key] = tag;
    }

    // Keep every machine image of this build; remove earlier builds.
    await pruneImages(labRepoPrefix(labId), Object.values(images));

    stream.end({ type: "result", ok: true, images });
  } catch (error) {
    console.error("[Lab builder]", error);
    stream.end({ type: "result", ok: false, error: error.message || "The lab could not be built." });
  }
}

export async function handleDeleteLab(req, res) {
  const { labId } = (await readJson(req)) ?? {};
  if (!labId) throw new HttpError("Missing labId.");
  await pruneImages(labRepoPrefix(labId), []);
  sendJson(res, 200, { ok: true });
}
