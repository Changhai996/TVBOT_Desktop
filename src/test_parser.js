function parseNewick(a){for(var e=[],r={},s=a.split(/(;|\(|\)|,|:)/),t=0;t<s.length;t++){var n=s[t];switch(n){case"":case";":break;case"(":var c={};r.children=[c],e.push(r),r=c;break;case",":var c={};e[e.length-1].children.push(c),r=c;break;case")":r=e.pop();break;case":":break;default:var h=s[t-1];":"==h?r.length=parseFloat(n):r.name=n}}return r}
console.log(parseNewick("(A:0.1,B:0.2)C:0.3;"));
