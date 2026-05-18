const fs = require('fs');
let data = {
    plotType: "redTree",
    figureData: {
        leaves: {
            "Text style": { switch: { type: "check", value: true, isFresh: true } }
        },
        branches: {
            Bootstraps: { switch: { type: "check", value: true, isFresh: true } }
        }
    }
};
console.log("JSON:", JSON.stringify(data));
