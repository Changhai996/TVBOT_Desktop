type BoxPlotSummary = {
    min: unknown;
    q1: unknown;
    m: unknown;
    q3: unknown;
    max: unknown;
    name: string;
    pointArr: unknown[];
};

class BoxPlot {
    mainPlot: unknown;

    constructor(mainPlot: unknown) {
        this.mainPlot = mainPlot;
    }

    dataTransform(data: Record<string, unknown>[], featureArr: string[]): BoxPlotSummary[] {
        const final_data_arr: BoxPlotSummary[] = [];
        featureArr.forEach((key) => {
            const range = data.map((ele) => ele[key]).sort() as unknown[];

            const R_arr = [0, 0.25, 0.5, 0.75, 1];
            const dict: BoxPlotSummary = {
                min: null,
                q1: null,
                m: null,
                q3: null,
                max: null,
                name: key,
                pointArr: range
            };
            const [min, q1, m, q3, max] = R_arr.map((v) => d3.quantile(range, v));

            dict.min = min;
            dict.q1 = q1;
            dict.m = m;
            dict.q3 = q3;
            dict.max = max;

            final_data_arr.push(dict);
        });

        return final_data_arr;
    }
}

export { BoxPlot };
