import React from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import highchartsMore from 'highcharts/highcharts-more'
import { SkillInventory } from '@/types'
import styled from 'styled-components'

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

const RadarContainer = styled.div`
  width: 100%;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%);
  padding: 1rem;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.2);
`

export function CareerRadar({ skills }: { skills: SkillInventory[] }) {
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
          color: '#a1a1aa',
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
      gridLineColor: 'rgba(255,255,255,0.1)',
      labels: {
        enabled: false,
      },
    },
    tooltip: {
      shared: true,
      pointFormat: '<span style="color:{series.color}"><b>{point.y:,.0f}</b>/5<br/>',
      backgroundColor: 'rgba(24, 24, 27, 0.9)',
      style: {
        color: '#f4f4f5',
      },
      borderColor: '#3f3f46',
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
        color: '#8b5cf6', // Violet 500
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(139, 92, 246, 0.5)'],
            [1, 'rgba(139, 92, 246, 0.1)']
          ]
        },
        marker: {
          fillColor: '#8b5cf6',
          lineColor: '#fff',
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
    <RadarContainer>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </RadarContainer>
  )
}
