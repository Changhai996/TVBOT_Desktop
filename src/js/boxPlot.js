class BoxPlot  {
    constructor(mainPlot) {

        this.mainPlot = mainPlot

    }

    dataTransform(data, featureArr){
        let final_data_arr =  []
        featureArr.forEach(key=>{
            let range = data.map(ele=>ele[key]).sort()

            let R_arr = [0, 0.25, 0.5, 0.75, 1]
            let dict = {}
            let [min, q1, m, q3, max] = R_arr.map(v=>d3.quantile(range, v))

            dict.min = min
            dict.q1 = q1
            dict.m = m
            dict.q3 = q3
            dict.max = max
            dict.name = key

            dict.pointArr = range


            final_data_arr.push(dict)




        })

        return final_data_arr
    }

}

export {BoxPlot}