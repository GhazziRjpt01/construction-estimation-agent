export async function saveEstimate(client, { name, inputs, result }) {
  const { data: project, error: projectError } = await client
    .from("projects")
    .insert({ name, inputs })
    .select("id")
    .single()

  if (projectError) {
    throw new Error(`Failed to save project: ${projectError.message}`)
  }

  const { data: estimate, error: estimateError } = await client
    .from("estimates")
    .insert({ project_id: project.id, result })
    .select("id, project_id, created_at")
    .single()

  if (estimateError) {
    await client.from("projects").delete().eq("id", project.id)
    throw new Error(`Failed to save estimate: ${estimateError.message}`)
  }

  return {
    id: estimate.id,
    projectId: estimate.project_id,
    createdAt: estimate.created_at,
  }
}

export async function getEstimate(client, id) {
  const { data, error } = await client
    .from("estimates")
    .select("id, project_id, result, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load estimate: ${error.message}`)
  }
  if (!data) {
    return null
  }

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("name, inputs")
    .eq("id", data.project_id)
    .maybeSingle()

  if (projectError) {
    throw new Error(`Failed to load project: ${projectError.message}`)
  }

  return {
    id: data.id,
    projectId: data.project_id,
    name: project?.name ?? null,
    inputs: project?.inputs ?? null,
    result: data.result,
    createdAt: data.created_at,
  }
}
