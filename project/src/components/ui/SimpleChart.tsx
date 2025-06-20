import React from 'react';

interface DataPoint {
    label: string;
    value: number;
    color?: string;
}

interface SimpleChartProps {
    data: DataPoint[];
    title: string;
    height?: number;
    type?: 'bar' | 'line';
}

const SimpleChart: React.FC<SimpleChartProps> = ({
    data,
    title,
    height = 200,
    type = 'bar'
}) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const scale = (height - 40) / (maxValue || 1);

    return (
        <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
            <div className="relative" style={{ height: `${height}px` }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                    <span>{maxValue}%</span>
                    <span>{Math.round(maxValue * 0.75)}%</span>
                    <span>{Math.round(maxValue * 0.5)}%</span>
                    <span>{Math.round(maxValue * 0.25)}%</span>
                    <span>0%</span>
                </div>

                {/* Chart area */}
                <div className="ml-8 h-full flex items-end gap-2">
                    {data.map((point, index) => {
                        if (type === 'bar') {
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center">
                                    <div
                                        className={`w-full ${point.color || 'bg-blue-500'} rounded-t`}
                                        style={{ height: `${point.value * scale}px` }}
                                        title={`${point.label}: ${point.value}%`}
                                    />
                                    <span className="text-xs text-gray-600 mt-2 truncate w-full text-center">
                                        {point.label}
                                    </span>
                                </div>
                            );
                        } else {
                            // Simple line chart implementation
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center relative">
                                    <div
                                        className={`w-2 h-2 ${point.color || 'bg-blue-500'} rounded-full absolute`}
                                        style={{ bottom: `${point.value * scale + 20}px` }}
                                        title={`${point.label}: ${point.value}%`}
                                    />
                                    <span className="text-xs text-gray-600 mt-2 truncate w-full text-center">
                                        {point.label}
                                    </span>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

export default SimpleChart;
