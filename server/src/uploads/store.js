import { randomUUID } from "node:crypto"

import { HttpError } from "../httpError.js"
import { collectExpiredPaths } from "./expiry.js"
import { extensionForPlan } from "./sniff.js"

export const PLAN_BUCKET = "plans"

export async function ensurePlansBucket(client) {
  const { data, error } = await client.storage.getBucket(PLAN_BUCKET)
  if (data) {
    return
  }
  if (error && !/not found/i.test(error.message ?? "")) {
    throw error
  }
  const created = await client.storage.createBucket(PLAN_BUCKET, {
    public: false,
  })
  if (created.error && !/already exists/i.test(created.error.message ?? "")) {
    throw created.error
  }
}

export async function deleteExpiredPlans(client) {
  const storage = client.storage.from(PLAN_BUCKET)
  const paths = await collectExpiredPaths(storage)
  if (paths.length === 0) {
    return
  }
  const { error } = await storage.remove(paths)
  if (error) {
    throw error
  }
}

export async function savePlanFile(client, { sessionId, bytes, contentType, originalName }) {
  await ensurePlansBucket(client)
  try {
    await deleteExpiredPlans(client)
  } catch (err) {
    console.error("Could not delete expired plans", err)
  }

  const fileId = randomUUID()
  const extension = extensionForPlan(contentType)
  const path = `${sessionId}/${fileId}.${extension}`
  const { error } = await client.storage.from(PLAN_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
    metadata: {
      uploadedAt: new Date().toISOString(),
      originalName: String(originalName ?? "").slice(0, 180),
    },
  })
  if (error) {
    throw new HttpError(502, "Could not store that file.")
  }
  return { fileId, path }
}
