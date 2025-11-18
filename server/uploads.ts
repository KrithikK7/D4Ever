import express from "express";
import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import type { Express } from "express";
import { fileTypeFromBuffer } from "file-type";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

type UploadCategory = "image" | "audio" | "video";

type UploadDescriptor = {
  mime: string;
  extension: string;
  category: UploadCategory;
};

const UPLOAD_DESCRIPTORS: UploadDescriptor[] = [
  { mime: "image/jpeg", extension: "jpg", category: "image" },
  { mime: "image/png", extension: "png", category: "image" },
  { mime: "image/webp", extension: "webp", category: "image" },
  { mime: "image/gif", extension: "gif", category: "image" },
  { mime: "image/avif", extension: "avif", category: "image" },
  { mime: "video/mp4", extension: "mp4", category: "video" },
  { mime: "video/webm", extension: "webm", category: "video" },
  { mime: "video/quicktime", extension: "mov", category: "video" },
  { mime: "video/x-msvideo", extension: "avi", category: "video" },
  { mime: "video/x-ms-wmv", extension: "wmv", category: "video" },
  { mime: "audio/mpeg", extension: "mp3", category: "audio" },
  { mime: "audio/mp4", extension: "m4a", category: "audio" },
  { mime: "audio/wav", extension: "wav", category: "audio" },
  { mime: "audio/x-wav", extension: "wav", category: "audio" },
  { mime: "audio/aac", extension: "aac", category: "audio" },
  { mime: "audio/flac", extension: "flac", category: "audio" },
  { mime: "audio/x-flac", extension: "flac", category: "audio" },
  { mime: "audio/ogg", extension: "ogg", category: "audio" },
];

const mimeLookup = new Map<string, UploadDescriptor>();
const extensionLookup = new Map<string, UploadDescriptor>();

for (const descriptor of UPLOAD_DESCRIPTORS) {
  mimeLookup.set(descriptor.mime, descriptor);
  extensionLookup.set(descriptor.extension, descriptor);
}

let uploadsDirReady = false;

async function ensureUploadsDir() {
  if (!uploadsDirReady) {
    await fs.mkdir(uploadsDir, { recursive: true });
    uploadsDirReady = true;
  }
}

export async function persistUpload(
  file: Express.Multer.File,
  category: UploadCategory,
): Promise<{ url: string }> {
  if (!file || !file.buffer?.length) {
    throw new Error("No file buffer received");
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected) {
    throw new Error("Unsupported file type");
  }

  const descriptor = mimeLookup.get(detected.mime);
  if (!descriptor || descriptor.category !== category) {
    throw new Error("Unsupported file type");
  }

  await ensureUploadsDir();

  const fileName = `media-${Date.now()}-${randomUUID()}.${descriptor.extension}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, file.buffer, { mode: 0o644 });

  return { url: `/uploads/${fileName}` };
}

export function createUploadsRouter() {
  const router = express.Router();

  router.use((req, res, next) => {
    const ext = path.extname(req.path).replace(".", "").toLowerCase();
    const descriptor = extensionLookup.get(ext);
    if (!descriptor) {
      return res.status(404).json({ error: "File not found" });
    }
    res.locals.__uploadDescriptor = descriptor;
    next();
  });

  router.use(
    express.static(uploadsDir, {
      fallthrough: false,
      immutable: true,
      maxAge: "365d",
      setHeaders: (res) => {
        const descriptor = res.locals.__uploadDescriptor as UploadDescriptor | undefined;
        res.setHeader("Content-Type", descriptor?.mime ?? "application/octet-stream");
        const policy =
          descriptor?.category === "image"
            ? "default-src 'none'; img-src 'self' data:; style-src 'none';"
            : "default-src 'none'; media-src 'self' data:;";
        res.setHeader("Content-Security-Policy", policy);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Disposition", "inline");
      },
    }),
  );

  router.use((err: NodeJS.ErrnoException, _req, res, next) => {
    if (err && (err.code === "ENOENT" || err.statusCode === 404)) {
      return res.status(404).json({ error: "File not found" });
    }
    next(err);
  });

  return router;
}

export type { UploadCategory };
