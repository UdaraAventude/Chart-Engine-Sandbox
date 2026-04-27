import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function D3Renderer({ dataset, chartConfig, onRenderTime }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!dataset || !chartConfig || !svgRef.current) return

    const start = performance.now()
    const { x_axis, y_axis, title } = chartConfig

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    const margin = { top: 40, right: 30, bottom: 50, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = 380 - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', 380)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const xVals = dataset.map(d => +d[x_axis]).filter(v => !isNaN(v))
    const yVals = dataset.map(d => +d[y_axis]).filter(v => !isNaN(v))

    if (xVals.length === 0 || yVals.length === 0) return;

    const xScale = d3.scaleLinear()
      .domain([d3.min(xVals), d3.max(xVals)])
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([d3.min(yVals), d3.max(yVals)])
      .range([height, 0])

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))

    svg.append('g')
      .call(d3.axisLeft(yScale))

    // Axis labels
    svg.append('text')
      .attr('x', width / 2).attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px').text(x_axis)

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2).attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px').text(y_axis)

    // Title
    svg.append('text')
      .attr('x', width / 2).attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px').style('font-weight', '500')
      .text(title)

    // Dots — limit to 2000 for D3 SVG performance (as per user request)
    const renderData = dataset.slice(0, 2000)

    svg.selectAll('circle')
      .data(renderData)
      .join('circle')
      .attr('cx', d => xScale(+d[x_axis]))
      .attr('cy', d => yScale(+d[y_axis]))
      .attr('r', 4)
      .attr('fill', '#378ADD')
      .attr('opacity', 0.6)

    // Measure render time after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onRenderTime?.((performance.now() - start).toFixed(2))
      })
    })

  }, [dataset, chartConfig])

  return <svg ref={svgRef} style={{ width: '100%', height: '380px' }} />
}
