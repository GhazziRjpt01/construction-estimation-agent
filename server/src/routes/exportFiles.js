import ExcelJS from "exceljs"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import { DISCLAIMER, NOT_INCLUDED, PARTIAL_LABEL } from "../estimators/estimateHouse.js"
import { formatCurrency } from "../estimators/money.js"

const INK = rgb(0.04, 0.05, 0.07)

function amount(value, currency = "USD") {
  return formatCurrency(Number(value), currency)
}

function reportOf(input) {
  if (input?.result && !input.divisions) {
    return {
      estimate: input.result,
      inputs: input.inputs ?? null,
      createdAt: input.createdAt ?? null,
      name: input.name ?? null,
    }
  }
  return {
    estimate: input,
    inputs: input?.inputs ?? null,
    createdAt: input?.createdAt ?? null,
    name: input?.name ?? null,
  }
}

function currencyOf(estimate) {
  return estimate.currency || "USD"
}

function assumptionLines(estimate) {
  return (estimate.assumptions ?? []).filter(
    (line) => line && line !== estimate.disclaimer && line !== DISCLAIMER
  )
}

function excludedItems(estimate) {
  return estimate.notIncluded?.length ? estimate.notIncluded : NOT_INCLUDED
}

function scopeLabel(estimate) {
  return estimate.totals?.scopeLabel || PARTIAL_LABEL
}

function shownQuantity(item) {
  return item.displayQuantity ?? item.quantity
}

function shownUnit(item) {
  return item.displayUnit ?? item.unit
}

function inputLines(inputs) {
  if (!inputs) {
    return []
  }
  const lines = []
  if (inputs.footprintSqft != null) {
    lines.push(`Footprint ${inputs.footprintSqft} sqft`)
  }
  if (inputs.stories != null) {
    lines.push(`Stories ${inputs.stories}`)
  }
  if (inputs.zip) {
    lines.push(`ZIP ${inputs.zip}`)
  }
  if (inputs.region) {
    lines.push(`Region ${inputs.region}`)
  }
  if (inputs.foundation) {
    lines.push(`Foundation ${inputs.foundation}`)
  }
  if (inputs.bedrooms != null) {
    lines.push(`Bedrooms ${inputs.bedrooms}`)
  }
  if (inputs.bathrooms != null) {
    lines.push(`Bathrooms ${inputs.bathrooms}`)
  }
  if (inputs.finishGrade) {
    lines.push(`Finish ${inputs.finishGrade}`)
  }
  return lines
}

function formatDate(value) {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date)
}

function quantity(value) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })
}

function pdfText(value) {
  return String(value)
    .replaceAll("×", "x")
    .replaceAll("±", "+/-")
    .replaceAll("—", "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?")
}

const MONEY_FORMAT = '"$"#,##0.00'

export async function estimateToXlsx(source) {
  const { estimate, inputs, createdAt, name } = reportOf(source)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Construction estimation agent"

  const project = workbook.addWorksheet("Project")
  project.addRow([name || "House estimate"])
  const date = formatDate(createdAt)
  if (date) {
    project.addRow(["Date", date])
  }
  for (const line of inputLines(inputs)) {
    project.addRow([line])
  }
  project.addRow([])
  project.addRow([scopeLabel(estimate), estimate.totals.total])
  project.getRow(1).font = { bold: true }
  project.getColumn(1).width = 48
  project.getColumn(2).width = 24
  project.getColumn(2).numFmt = MONEY_FORMAT

  const divisions = workbook.addWorksheet("Divisions")
  divisions.addRow([
    "Code",
    "Division",
    "Material",
    "Labor hours",
    "Labor",
    "Total",
  ])
  for (const division of estimate.divisions) {
    divisions.addRow([
      division.code,
      division.name,
      division.materialCost,
      division.laborHours,
      division.laborCost,
      division.materialCost + division.laborCost,
    ])
  }
  divisions.addRow([])
  divisions.addRow(["Direct", estimate.totals.direct])
  divisions.addRow([scopeLabel(estimate), estimate.totals.total])
  divisions.addRow(["Low", estimate.totals.low])
  divisions.addRow(["High", estimate.totals.high])
  divisions.addRow(["Per sqft", estimate.totals.perSqft])
  divisions.getRow(1).font = { bold: true }
  for (const column of [3, 5, 6]) {
    divisions.getColumn(column).numFmt = MONEY_FORMAT
  }
  divisions.columns.forEach((column) => {
    column.width = 24
  })

  const quantities = workbook.addWorksheet("Quantities")
  quantities.addRow(["Division", "Item", "Qty", "Unit", "Cost"])
  for (const division of estimate.divisions) {
    for (const item of division.materials) {
      quantities.addRow([
        `${division.code} ${division.name}`,
        item.name,
        shownQuantity(item),
        shownUnit(item),
        item.cost,
      ])
    }
  }
  quantities.getRow(1).font = { bold: true }
  quantities.getColumn(5).numFmt = MONEY_FORMAT
  quantities.columns.forEach((column) => {
    column.width = 28
  })

  const assumptions = workbook.addWorksheet("Assumptions")
  assumptions.addRow(["Assumption"])
  for (const line of assumptionLines(estimate)) {
    assumptions.addRow([line])
  }
  assumptions.addRow([])
  assumptions.addRow(["Not included"])
  for (const item of excludedItems(estimate)) {
    assumptions.addRow([item])
  }
  assumptions.addRow([])
  assumptions.addRow(["Disclaimer", estimate.disclaimer ?? DISCLAIMER])
  assumptions.getRow(1).font = { bold: true }
  assumptions.getColumn(1).width = 120

  return workbook.xlsx.writeBuffer()
}

export async function estimateToPdf(source) {
  const { estimate, inputs, createdAt, name } = reportOf(source)
  const currency = currencyOf(estimate)
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const pageSize = [612, 792]
  const margin = 48
  const width = pageSize[0] - margin * 2
  let page = doc.addPage(pageSize)
  let y = pageSize[1] - margin

  function nextPage() {
    page = doc.addPage(pageSize)
    y = pageSize[1] - margin
  }

  function draw(text, { size = 10, face = font, gap = 4 } = {}) {
    const lineHeight = size + gap
    if (y - lineHeight < margin) {
      nextPage()
    }
    page.drawText(pdfText(text), {
      x: margin,
      y,
      size,
      font: face,
      color: INK,
    })
    y -= lineHeight
  }

  function wrap(text, size, face) {
    const words = pdfText(text).split(/\s+/).filter(Boolean)
    const lines = []
    let line = ""
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (face.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) {
      lines.push(line)
    }
    return lines.length > 0 ? lines : [""]
  }

  function paragraph(text, options) {
    for (const line of wrap(text, options?.size ?? 10, options?.face ?? font)) {
      draw(line, options)
    }
  }

  draw(name || "House estimate", { size: 18, face: bold, gap: 8 })
  const date = formatDate(createdAt)
  if (date) {
    draw(date, { size: 11 })
  }
  for (const line of inputLines(inputs)) {
    draw(line, { size: 11 })
  }

  y -= 8
  draw("CSI divisions", { size: 13, face: bold, gap: 8 })
  draw("Code  Division                  Material        Labor           Total", {
    size: 9,
    face: bold,
  })
  for (const division of estimate.divisions) {
    const divisionName = division.name.padEnd(22, " ").slice(0, 22)
    const total = division.materialCost + division.laborCost
    draw(
      `${division.code}    ${divisionName}  ${amount(division.materialCost, currency)}  ${amount(division.laborCost, currency)}  ${amount(total, currency)}`,
      { size: 9 }
    )
  }

  y -= 8
  draw("Totals", { size: 13, face: bold, gap: 8 })
  draw(`Direct ${amount(estimate.totals.direct, currency)}`)
  draw(`${scopeLabel(estimate)} ${amount(estimate.totals.total, currency)}`)
  draw(`Low ${amount(estimate.totals.low, currency)}`)
  draw(`High ${amount(estimate.totals.high, currency)}`)
  draw(`Per sqft ${amount(estimate.totals.perSqft, currency)}`)

  y -= 8
  draw("Quantities", { size: 13, face: bold, gap: 8 })
  draw("Division  Item  Qty  Unit  Cost", { size: 9, face: bold })
  for (const division of estimate.divisions) {
    for (const item of division.materials) {
      paragraph(
        `${division.code} ${division.name}  ${item.name}  ${quantity(shownQuantity(item))} ${shownUnit(item)}  ${amount(item.cost, currency)}`,
        { size: 9 }
      )
    }
  }

  y -= 8
  draw("Assumptions", { size: 13, face: bold, gap: 8 })
  for (const line of assumptionLines(estimate)) {
    paragraph(line, { size: 9 })
    y -= 2
  }

  y -= 6
  draw("Not included", { size: 13, face: bold, gap: 8 })
  for (const item of excludedItems(estimate)) {
    draw(item, { size: 10 })
  }

  y -= 8
  paragraph(estimate.disclaimer ?? DISCLAIMER, { size: 11, face: bold })

  return doc.save()
}
