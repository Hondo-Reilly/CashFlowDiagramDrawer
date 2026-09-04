import { useRef, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Divider } from '@astryxdesign/core/Divider'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { HStack, VStack } from '@astryxdesign/core/Layout'
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Link } from '@astryxdesign/core/Link'

let nextId = 7

const AXIS_COLOR = '#000000'
const POSITIVE_COLOR = '#16a34a'
const NEGATIVE_COLOR = '#dc2626'
const ARROW_HEAD = 10
const MAX_ARROW = 90
const MIN_ARROW = 28

function formatCash(amount) {
  const abs = Math.abs(amount)
  return Number.isInteger(abs) ? `$${abs}` : `$${abs.toFixed(2)}`
}

function parseNumericCashInput(raw) {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '+') {
    return null
  }
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

function parseCashFlow(raw) {
  const text = String(raw ?? '').trim()
  if (text === '') {
    return { kind: 'empty', label: '', amount: null }
  }
  const amount = parseNumericCashInput(text)
  if (amount != null) {
    return { kind: 'number', label: formatCash(amount), amount }
  }
  return { kind: 'text', label: text, amount: null }
}

function periodBoxSize(label) {
  const fontSize = 16
  const padX = 6
  const padY = 3
  const textWidth = Math.max(10, String(label).length * fontSize * 0.62)
  return {
    width: textWidth + padX * 2,
    height: fontSize + padY * 2,
  }
}

function flowColor(flow, useColors, arrowDirection) {
  if (!useColors) {
    return AXIS_COLOR
  }
  if (flow.kind === 'number') {
    if (flow.amount > 0) {
      return POSITIVE_COLOR
    }
    if (flow.amount < 0) {
      return NEGATIVE_COLOR
    }
    return AXIS_COLOR
  }
  if (flow.kind === 'text') {
    return arrowDirection === 'down' ? NEGATIVE_COLOR : POSITIVE_COLOR
  }
  return AXIS_COLOR
}

function DiagramDrawer({ periods, useColors, svgRef }) {
  const dataPoints = periods
    .map((row) => ({ row, period: Number(row.period) }))
    .filter(({ period }) => Number.isFinite(period))
    .sort((a, b) => a.period - b.period)

  const rowByPeriod = new Map()
  for (const point of dataPoints) {
    rowByPeriod.set(point.period, point.row)
  }

  const minPeriod = dataPoints.length
    ? Math.min(...dataPoints.map((point) => point.period))
    : 0
  const maxPeriod = dataPoints.length
    ? Math.max(...dataPoints.map((point) => point.period))
    : 0
  const startTick = Math.floor(minPeriod)
  const endTick = Math.ceil(maxPeriod)
  const periodRange = endTick - startTick

  const ticks = []
  if (dataPoints.length > 0) {
    for (let period = startTick; period <= endTick; period += 1) {
      ticks.push(period)
    }
    for (const point of dataPoints) {
      if (!Number.isInteger(point.period) && !ticks.includes(point.period)) {
        ticks.push(point.period)
      }
    }
    ticks.sort((a, b) => a - b)
  }

  const flowsByPeriod = new Map(
    ticks.map((period) => {
      const row = rowByPeriod.get(period)
      return [period, row ? parseCashFlow(row.cashFlow) : null]
    }),
  )
  const numericAbs = [...flowsByPeriod.values()]
    .filter((flow) => flow?.kind === 'number' && flow.amount !== 0)
    .map((flow) => Math.abs(flow.amount))
  const maxAbs = Math.max(1, ...numericAbs)

  const padX = 48
  const padTop = 36
  const padBottom = 36
  const axisY = padTop + MAX_ARROW + 24
  const tickCount = Math.max(1, ticks.length)
  const width = Math.max(360, tickCount * 72 + padX * 2)
  const height = axisY + MAX_ARROW + padBottom
  const defaultShaft = (MIN_ARROW + MAX_ARROW) / 2

  function xAt(periodNum) {
    if (ticks.length <= 1 || periodRange === 0) {
      return width / 2
    }
    return padX + ((periodNum - startTick) / periodRange) * (width - padX * 2)
  }

  const axisStartX = ticks.length ? xAt(ticks[0]) : padX
  const axisEndX = ticks.length ? xAt(ticks[ticks.length - 1]) : width - padX

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label="Cash flow diagram"
      style={{ display: 'block', overflow: 'visible', background: '#ffffff' }}
    >
      <rect width={width} height={height} fill="#ffffff" />
      {ticks.length > 0 && (
        <line
          x1={axisStartX}
          y1={axisY}
          x2={axisEndX}
          y2={axisY}
          stroke={AXIS_COLOR}
          strokeWidth={2.5}
        />
      )}

      {ticks.map((periodNum) => {
        const row = rowByPeriod.get(periodNum)
        const flow = flowsByPeriod.get(periodNum)
        const arrowDirection = row?.arrowDirection === 'down' ? 'down' : 'up'
        const x = xAt(periodNum)
        const periodLabel = String(periodNum)
        const box = periodBoxSize(periodLabel)
        const color = flow
          ? flowColor(flow, useColors, arrowDirection)
          : AXIS_COLOR

        const isZeroNumber = flow?.kind === 'number' && flow.amount === 0
        const showArrow =
          !!flow &&
          (flow.kind === 'text' || (flow.kind === 'number' && !isZeroNumber))
        const isPositive =
          flow?.kind === 'number'
            ? flow.amount > 0
            : arrowDirection !== 'down'
        const shaft =
          flow?.kind === 'number'
            ? MIN_ARROW +
              (Math.abs(flow.amount) / maxAbs) * (MAX_ARROW - MIN_ARROW)
            : defaultShaft
        const tipY = isPositive ? axisY - shaft : axisY + shaft
        const labelY = isPositive ? tipY - 14 : tipY + 18

        return (
          <g key={row?.id ?? `tick-${periodNum}`}>
            {showArrow && (
              <>
                <line
                  x1={x}
                  y1={axisY}
                  x2={x}
                  y2={isPositive ? tipY + ARROW_HEAD : tipY - ARROW_HEAD}
                  stroke={color}
                  strokeWidth={2.5}
                />
                <polygon
                  points={
                    isPositive
                      ? `${x},${tipY} ${x - ARROW_HEAD / 2},${tipY + ARROW_HEAD} ${x + ARROW_HEAD / 2},${tipY + ARROW_HEAD}`
                      : `${x},${tipY} ${x - ARROW_HEAD / 2},${tipY - ARROW_HEAD} ${x + ARROW_HEAD / 2},${tipY - ARROW_HEAD}`
                  }
                  fill={color}
                />
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  fill={color}
                  fontSize="15"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {flow.label}
                </text>
              </>
            )}
            <rect
              x={x - box.width / 2}
              y={axisY - box.height / 2}
              width={box.width}
              height={box.height}
              fill="#ffffff"
            />
            <text
              x={x}
              y={axisY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={AXIS_COLOR}
              fontSize="16"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {periodLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

async function copySvgAsPng(svg) {
  if (!svg) {
    throw new Error('Diagram not ready')
  }

  const serializer = new XMLSerializer()
  let source = serializer.serializeToString(svg)
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  const viewBox = svg.viewBox.baseVal
  const exportWidth = viewBox.width || svg.clientWidth || 720
  const exportHeight = viewBox.height || svg.clientHeight || 320
  const scale = 2

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to render diagram'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = exportWidth * scale
    canvas.height = exportHeight * scale
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error('Failed to create image')),
        'image/png',
      )
    })

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ])
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function App() {
  const svgRef = useRef(null)
  const [useColors, setUseColors] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy diagram')
  const [periods, setPeriods] = useState([
    { id: 1, period: 0, cashFlow: '100', arrowDirection: 'up' },
    { id: 2, period: 1, cashFlow: '-100', arrowDirection: 'up' },
    { id: 3, period: 2, cashFlow: '100', arrowDirection: 'up' },
    { id: 4, period: 3, cashFlow: '-150', arrowDirection: 'up' },
    { id: 5, period: 4, cashFlow: '-150', arrowDirection: 'up' },
    { id: 6, period: 5, cashFlow: '50', arrowDirection: 'up' },
  ])

  function updatePeriod(id, field, value) {
    setPeriods((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function toggleArrowDirection(id) {
    setPeriods((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              arrowDirection: row.arrowDirection === 'down' ? 'up' : 'down',
            }
          : row,
      ),
    )
  }

  function addPeriod() {
    const nextPeriod =
      periods.length === 0
        ? 0
        : Math.max(...periods.map((row) => Number(row.period) || 0)) + 1
    setPeriods([
      ...periods,
      {
        id: nextId++,
        period: nextPeriod,
        cashFlow: '0',
        arrowDirection: 'up',
      },
    ])
  }

  async function handleCopyDiagram() {
    try {
      await copySvgAsPng(svgRef.current)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy diagram'), 1500)
    } catch {
      setCopyLabel('Copy failed')
      window.setTimeout(() => setCopyLabel('Copy diagram'), 1500)
    }
  }

  return (
    <Center minHeight="100vh" padding={6}>
      <Card maxWidth={720} width="100%">
        <VStack gap={4}>
          <Heading level={1}>Cash Flow Diagram Drawer</Heading>
          <Text>
            This is a tool to help you draw cash flow diagrams.
            Created by{' '}
            <Link
              href="https://hondoreilly.com"
              color="inherit"
              style={{ color: 'var(--color-text-blue)' }}
            >
              Hondo Reilly
            </Link>
          </Text>

          <Divider />

          <VStack gap={3}>
            <HStack gap={3} align="center" justify="between" wrap="wrap">
              <CheckboxInput
                label="Diagram colors"
                value={useColors}
                onChange={setUseColors}
                size="sm"
              />
              <Button
                label={copyLabel}
                variant="secondary"
                size="sm"
                onClick={handleCopyDiagram}
              />
            </HStack>
            <DiagramDrawer
              periods={periods}
              useColors={useColors}
              svgRef={svgRef}
            />
          </VStack>

          <Divider />

          <Table>
            <TableHeader>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Cash Flow</TableHeaderCell>
            </TableHeader>

            <TableBody>
              {periods.map((row) => {
                const flow = parseCashFlow(row.cashFlow)
                const showDirectionToggle = flow.kind === 'text'
                const arrowDirection =
                  row.arrowDirection === 'down' ? 'down' : 'up'

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <TextInput
                        label={`Period ${row.period}`}
                        isLabelHidden
                        value={String(row.period)}
                        onChange={(value) =>
                          updatePeriod(row.id, 'period', value)
                        }
                        size="sm"
                        width="100%"
                      />
                    </TableCell>
                    <TableCell>
                      <HStack gap={2} align="center">
                        <TextInput
                          label={`Cash flow for period ${row.period}`}
                          isLabelHidden
                          value={String(row.cashFlow)}
                          onChange={(value) =>
                            updatePeriod(row.id, 'cashFlow', value)
                          }
                          size="sm"
                          width="100%"
                        />
                        {showDirectionToggle && (
                          <IconButton
                            label={
                              arrowDirection === 'down'
                                ? 'Point arrow up'
                                : 'Point arrow down'
                            }
                            tooltip={
                              arrowDirection === 'down'
                                ? 'Arrow pointing down — click to point up'
                                : 'Arrow pointing up — click to point down'
                            }
                            icon={
                              <Icon
                                icon={
                                  arrowDirection === 'down'
                                    ? 'arrowDown'
                                    : 'arrowUp'
                                }
                              />
                            }
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleArrowDirection(row.id)}
                          />
                        )}
                      </HStack>
                    </TableCell>
                  </TableRow>
                )
              })}
              </TableBody>
          </Table>
          <Button label="Add Period" onClick={addPeriod} />
        </VStack>
      </Card>
    </Center>
  )
}
