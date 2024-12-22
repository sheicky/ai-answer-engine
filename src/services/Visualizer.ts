import type { ChartConfiguration } from 'chart.js';

interface ChartData {
  [key: string]: unknown;
}

interface ChartOptions {
  xAxis: string;
  yAxis?: string;
  title?: string;
}

export class Visualizer {
  generateChart(
    data: ChartData[], 
    type: 'bar' | 'line' | 'pie' | 'histogram', 
    options: ChartOptions
  ): ChartConfiguration {
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

  private createBarChart(data: ChartData[], options: ChartOptions): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(item => String(item[options.xAxis])),
        datasets: [{
          label: options.yAxis || '',
          data: data.map(item => Number(item[options.yAxis || options.xAxis]) || 0),
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

  private createLineChart(data: ChartData[], options: ChartOptions): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: data.map(item => String(item[options.xAxis])),
        datasets: [{
          label: options.yAxis || '',
          data: data.map(item => Number(item[options.yAxis || options.xAxis]) || 0),
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!options.title,
            text: options.title || '',
          }
        }
      }
    };
  }

  private createPieChart(data: ChartData[], options: ChartOptions): ChartConfiguration {
    return {
      type: 'pie',
      data: {
        labels: data.map(item => String(item[options.xAxis])),
        datasets: [{
          data: data.map(item => Number(item[options.yAxis || options.xAxis]) || 0),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
          ],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!options.title,
            text: options.title || '',
          }
        }
      }
    };
  }

  private createHistogram(data: ChartData[], options: ChartOptions): ChartConfiguration {
    // Implement histogram logic here
    return this.createBarChart(data, options); // Fallback to bar chart for now
  }
} 