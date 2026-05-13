class TreeParser {
  nodeArr: any[] = [];
  root: any = null;

  constructor() {}

  identifyTreeFile(t: any) {
    if ("object" == typeof t)
      return this.parsePhyloxml(t);
    {
      let e = t.trim().split("\n");
      return e[0].trim().toUpperCase().startsWith("#NEXUS")
        ? this.parseNexus(e)
        : this.parseNewick(t);
    }
  }
  parseNewick(e: string, A?: Record<string, string>) {
    this.nodeArr = [];
    const v = this;
    e = (e = (e = (e = e.replaceAll("\n", "").replaceAll("\r", "")).slice(
      e.indexOf("("),
    )).trim()).endsWith(";")
      ? e.slice(0, -1)
      : e;
    let W = 0;
    const getChar = (text: string, idx: number) => text.charAt(idx);
    const trimArrInPlace = (arr: (string | undefined)[]) => {
      for (let i = 0; i < arr.length; i++) {
        const val = arr[i];
        if (val != null) arr[i] = val.trim();
      }
    };
    const stripBracketSuffix = (raw: string) => {
      const m = raw.match(/^[^[]*/g);
      return m && m[0] != null ? m[0] : raw;
    };

    let t = (function t(r: string, e: any = void 0) {
      let l = 0,
        i = !1,
        s = "";
      for (let e = 0, t = 0, n = 0; n < r.length; n++)
        if (!["'", '"'].includes(getChar(r, n)) || i) {
          if (
            (getChar(r, n) == s && i && (i = !1),
            "(" != getChar(r, n) || i || e++,
            ")" != getChar(r, n) || i || t++,
            e == t)
          ) {
            l = n;
            break;
          }
        } else ((i = !0), (s = getChar(r, n)));
      let n: (string | undefined)[] = r.slice(l + 1).split(":");
      trimArrInPlace(n);
      if ((1 == n.length && n.push(void 0), n[1])) {
        let e = n[1].match(/\[[0-9.]*\]/);
        e &&
          ((n[0] = e[0].slice(1, -1)),
          console.log("处理bt值隐藏在[]里面的情况", e, n));
      }
      let h: any = {
        name: n[0],
        length: n[1] ? Number(stripBracketSuffix(n[1])) : Number(n[1]),
        btArr: [],
        children: [],
        nodeIndex: `N${W}`,
        uniformNodeId: `N${W}`,
        parent: e,
      };
      if ((v.nodeArr.push(h), W++, "" != n[0])) {
        const n0 = String(n[0] ?? "");
        var a = n0.match(/^\d+(\.\d+)?\/\d+(\.\d+)?$/);
        n0.split("/").forEach((e: string) => {
          isNaN(Number(e)) || h.btArr.push(Number(e));
        });
        let e = n0.match(/\[&.*\]/);
        if (e) {
          var o = e[0].slice(2, -1);
          let t = [],
            n = 0,
            r = 0,
            l: Record<string, any> = {};
          var d = (e: any[]) => {
            let t = e.join("").split("=");
            if (t.length < 2) return;
            const key = t[0];
            const rhs = t[1];
            if (!key || rhs == null) return;
            if (rhs.startsWith("{")) {
              l[key] = rhs
                .slice(1, -1)
                .split(",")
                .map((e: any) => Number(e));
              return;
            }
            const parsedVal = rhs.startsWith('"')
              ? Number(rhs.slice(1, -1))
              : Number(rhs);
            l[key] = isNaN(parsedVal) ? rhs.slice(1, -1) : parsedVal;
          };
          for (let e = 0; e < o.length; e++)
            ("," == o[e]
              ? n == r
                ? (d(t), (t = []))
                : t.push(o[e])
              : ("{" == o[e] ? n++ : "}" == o[e] && r++, t.push(o[e])),
              e == o.length - 1 && d(t));
          h.otherProperty_L = l;
        } else
          null == a &&
            isNaN(Number(n0)) &&
            ((h.hasInternalNodeID = !0),
            (h.internalNodeID = n0),
            (h.uniformNodeId = n0));
      }
      var c = r.slice(0, l + 1);
      let m: string[] = [],
        p = 0,
        u = 0,
        f = !1,
        N = "",
        g = 0,
        b = 0;
      for (let e = 0; e < c.length; e++)
        if ("(" == getChar(c, e)) (m.push(getChar(c, e)), f || p++);
        else if ("[" == getChar(c, e)) (m.push(getChar(c, e)), g++);
        else if ("]" == getChar(c, e)) (m.push(getChar(c, e)), b++);
        else if ("," == getChar(c, e))
          if (p - u == 1 && g == b) {
            let n = m.slice(1).join("").trim();
            if (((m = m.slice(0, 1)), n.startsWith("(")))
              h.children.push(t(n, h));
            else {
              let t: (string | undefined)[] = [];
              if (n.startsWith("'") || n.startsWith('"')) {
                console.log(n);
                const quote = n.charAt(0);
                const quoteIdx = n.lastIndexOf(quote);
                ((t[0] = n.slice(1, quoteIdx)),
                  (t[1] =
                    quoteIdx == n.length - 1
                      ? void 0
                      : n.slice(n.lastIndexOf(":") + 1)));
              } else {
                t = n.split(":");
                trimArrInPlace(t);
              }
              1 == t.length && t.push(void 0);
              let e: any = {
                name: stripBracketSuffix(String(t[0] ?? "")),
                length: t[1] ? Number(stripBracketSuffix(t[1])) : Number(t[1]),
                nodeIndex: `N${W}`,
                parent: h,
              };
              (A && e.name in A && (e.name = A[e.name]),
                (e.uniformNodeId = e.name),
                h.children.push(e),
                v.nodeArr.push(e),
                W++);
            }
          } else m.push(getChar(c, e));
        else
          ")" == getChar(c, e)
            ? (m.push(getChar(c, e)), f || u++)
            : ["'", '"'].includes(getChar(c, e)) && !f
              ? ((f = !0), m.push(getChar(c, e)), (N = getChar(c, e)))
              : (getChar(c, e) == N && f && (f = !1), m.push(getChar(c, e)));
      let x = m.slice(1, m.lastIndexOf(")")).join("").trim();
      if (x.startsWith("(")) h.children.push(t(x, h));
      else {
        let t: (string | undefined)[] = [];
        if (x.startsWith("'") || x.startsWith('"')) {
          const quote = x.charAt(0);
          const quoteIdx = x.lastIndexOf(quote);
          t[0] = x.slice(1, quoteIdx);
          t[1] = quoteIdx == x.length - 1 ? void 0 : x.slice(x.lastIndexOf(":") + 1);
        }
        else {
          t = x.split(":");
          trimArrInPlace(t);
        }
        1 == t.length && t.push(void 0);
        let e: any = {
          name: stripBracketSuffix(String(t[0] ?? "")),
          length: t[1] ? Number(stripBracketSuffix(t[1])) : Number(t[1]),
          nodeIndex: `N${W}`,
          parent: h,
        };
        (A && e.name in A && (e.name = A[e.name]),
          (e.uniformNodeId = e.name),
          h.children.push(e),
          v.nodeArr.push(e),
          W++);
      }
      return h;
    })(e);
    const rootAny: any = t as any;
    if ((isNaN(rootAny.length) && (rootAny.length = 0), "otherProperty_L" in rootAny)) {
      for (const key in rootAny.otherProperty_L) {
        if (!key.includes("95%")) continue;
        if (key === "95%" || key === "height_95%_HPD" || key === "95%HPD") {
          const range = rootAny.otherProperty_L[key];
          rootAny.length = Number((((range[1] - range[0]) / 3) * 2).toFixed(10));
          rootAny.isDivergenceTimeTree = !0;
        }
      }
    }
    return ((this.root = t), t);
  }
  parseNexus(t: string[]) {
    let r = !1,
      l = !1,
      i = !1,
      s: Record<string, string> = {},
      h: any[] = [];
    for (let e = 0; e < t.length; e++) {
      let n = String(t[e] ?? "").trim();
      if (n.toUpperCase().startsWith("BEGIN TREE")) (console.log(n), (r = !0));
      else {
        if (r && n.toUpperCase().startsWith("END;")) {
          console.log("树文件结束");
          break;
        }
        if (r)
          if (n.toUpperCase().startsWith("TRANSLATE")) l = !0;
          else {
            let e = n.match(/^(\d+)[ \t](.*)[;,]?/);
            if (
              (e &&
                l &&
                (() => {
                  const k = e[1];
                  const v = e[2];
                  if (!k || v == null) return;
                  const raw = String(v);
                  s[String(k)] = raw.endsWith(",") || raw.endsWith(";") ? raw.slice(0, -1) : raw;
                })(),
              n.toUpperCase().startsWith("TREE") ||
                n.toUpperCase().startsWith("UTREE"))
            ) {
              let e = n.match(/tree (.+) =/i),
                t = "";
              ((t = e && e[1] ? e[1].trim() : `tree${h.length + 1}`),
                h.push({
                  name: t,
                  newick: -1 != n.indexOf("(") ? n.slice(n.indexOf("(")) : "",
                }),
                (l = !1),
                (i = !0));
            } else
              i && ((h[h.length - 1].newick += n), n.endsWith(";") && (i = !1));
          }
      }
    }
    return (console.log(h), console.log(s), this.parseNewick(h[0].newick, s));
  }
  parsePhyloxml(e: any) {
    const s = this;
    this.nodeArr = [];
    let h: Record<string, number> = {},
      a = 0;
    let t = (function r(e: any, t: any = void 0) {
      let n: any = e.selectChildren(),
        l: any = {
          name: "",
          length:
            null != e.attr("branch_length")
              ? Number(e.attr("branch_length"))
              : NaN,
          btArr: [],
          children: [],
          nodeIndex: `N${a}`,
          parent: t,
        };
      (a++, s.nodeArr.push(l));
      let i: any[] = [];
      return (
        n.each(function (this: any) {
          let e = d3.select(this),
            t = e.node();
          var n = t.tagName;
          switch ((i.push(n), n)) {
            case "name":
              ((l.name = t.innerHTML.trim()),
                l.name in h
                  ? ((h[l.name] = (h[l.name] ?? 0) + 1), (l.name = `${l.name}${h[l.name]}`))
                  : (h[l.name] = 0));
              break;
            case "clade":
              l.children.push(r(e, l));
              break;
            case "branch_length":
              l.length = Number(t.innerHTML.trim());
              break;
            case "taxonomy":
              ((l.name = e.select("scientific_name").text().trim()),
                l.name in h
                  ? ((h[l.name] = (h[l.name] ?? 0) + 1), (l.name = `${l.name}${h[l.name]}`))
                  : (h[l.name] = 0));
              break;
            case "confidence":
              l.btArr.push(Number(t.innerHTML));
          }
        }),
        i.includes("clade") || delete l.children,
        l
      );
    })(d3.select(e).select("phylogeny").selectChildren("clade"));
    return (isNaN(t.length) && (t.length = 0), (this.root = t), t);
  }
  reRoot(t: any, e = 0.5) {
    var n = this.nodeArr.findIndex((e) => e.nodeIndex == t);
    console.log("nodeIndex", n);
    var r,
      l = this.nodeArr[n];
    if ((console.log(t, l), "N0" == t)) return l;
    let i: any = { children: [], btArr: [], nodeIndex: "N-root", uniformNodeId: "N-root" };
    let s: any = {};
    for (r in l) s[r] = l[r];
    ((s.length = l.length * (1 - e)), (s.parent = i), i.children.push(s));
    let h = (function e(t: any): any {
      let n: any = { children: [] };
      return (
        t.parent.children.forEach((e: any) => {
          e != t && n.children.push(e);
        }),
        (n.length = t.length),
        (n.btArr = t.parent.btArr),
        (n.nodeIndex = t.nodeIndex),
        (n.uniformNodeId = t.uniformNodeId),
        (n.name = t.parent.name),
        t.parent && t.parent.parent && n.children.push(e(t.parent)),
        n
      );
    })(l);
    return (
      (h.length = l.length * e),
      (h.nodeIndex = "N-1"),
      (h.uniformNodeId = "N-1"),
      i.children.push(h),
      i.children.reverse(),
      (i.length = l.length * e),
      i
    );
  }
}
export { TreeParser };
