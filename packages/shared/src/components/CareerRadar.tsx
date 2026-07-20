import React from 'react'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'
import highchartsMore from 'highcharts/highcharts-more'
import { SkillInventory } from '@aios/shared/types'
import styled, { useTheme } from 'styled-components'

if (typeof Highcharts === 'object') {
  try {
    if (!(Highcharts as any).seriesTypes.polygon) {
      ;(highchartsMore as any)(Highcharts)
    }
  } catch (e) {}
}

const levelValues: Record<string, number> = {
  day_0: 0,
  beginner: 1,
  practitioner: 2,
  competent: 3,
  proficient: 4,
  expert: 5,
}



export function CareerRadar({ skills }: { skills: SkillInventory[] }) {
  const theme = useTheme()
  const categories = skills.map((s) => s.skill_name)
  const data = skills.map((s) => levelValues[s.level] || 0)

  if (!skills.length) {
    return null;
  }

  const options: Highcharts.Options = {
    chart: {
      polar: true,
      type: 'area',
      backgroundColor: 'transparent',
      height: 400,
      animation: {
        duration: 1500,
        easing: 'easeOutBounce'
      }
    },
    title: {
      text: '',
    },
    pane: {
      size: '80%',
    },
    xAxis: {
      categories: categories,
      tickmarkPlacement: 'on',
      lineWidth: 0,
      labels: {
        style: {
          color: theme.color.mutedForeground,
          fontSize: '12px',
          fontWeight: 'bold',
        },
      },
    },
    yAxis: {
      gridLineInterpolation: 'polygon',
      lineWidth: 0,
      min: 0,
      max: 5,
      tickInterval: 1,
      gridLineColor: `color-mix(in srgb, ${theme.color.border} 40%, transparent)`,
      labels: {
        enabled: false,
      },
    },
    tooltip: {
      shared: true,
      pointFormat: '<span style="color:{series.color}"><b>{point.y:,.0f}</b>/5<br/>',
      backgroundColor: theme.color.popover,
      style: {
        color: theme.color.popoverForeground,
      },
      borderColor: theme.color.border,
      borderRadius: 8,
    },
    legend: {
      enabled: false,
    },
    series: [
      {
        type: 'area',
        name: 'Skill Level',
        data: data,
        pointPlacement: 'on',
        color: theme.color.accent,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `color-mix(in srgb, ${theme.color.accent} 50%, transparent)`],
            [1, `color-mix(in srgb, ${theme.color.accent} 10%, transparent)`]
          ]
        },
        marker: {
          fillColor: theme.color.accent,
          lineColor: theme.color.card,
          lineWidth: 2,
          symbol: 'circle'
        }
      },
    ] as any,
    credits: {
      enabled: false,
    },
  }

  return (
    <HighchartsReact highcharts={Highcharts} options={options} />
  )
}
