const fs = require('fs');
const n1 = "(A:0.1,B:0.2)R1:0.3;";
const n2 = "(C:0.4,D:0.5)R2:0.6;";
const merged = `(${n1.slice(0, -1)},${n2.slice(0, -1)})SuperRoot;`;
console.log(merged);
