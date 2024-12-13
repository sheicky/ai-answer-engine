import { Chart } from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';

export class Visualizer {
  generateChart(data: any[], type: 'bar' | 'line' | 'pie' | 'histogram', options: {
    xAxis: string;
    yAxis?: string;
    title?: string;
  }): ChartConfiguration {
    switch (type) {
      case 'bar':
        return this.createBarChart(data, options);
      case 'line':
        return this.createLineChart(data, options);
      case 'pie':
        return this.createPieChart(data, options);
      case 'histogram':
        return this.createHistogram(data, options);
      default:
        throw new Error(`Unsupported chart type: ${type}`);
    }
  }

  private createBarChart(data: any[], options: any): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(item => item[options.xAxis]),
        datasets: [{
          label: options.yAxis || '',
          data: data.map(item => item[options.yAxis || options.xAxis]),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!options.title,
            text: options.title || '',
          },
        },
      }
    };
  }

  // Implement other chart types...
} 