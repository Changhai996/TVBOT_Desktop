const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const ROOT = '/Users/duanchanghai/Downloads/tools/TVBOT';
const SAMPLE_JSON = path.join(ROOT, 'data/default/concat_All100_54markers.json');
const SAMPLE_NWK = path.join(ROOT, 'tmp_test_unfold.tree');
const data = JSON.parse(fs.readFileSync(SAMPLE_JSON, 'utf8'));
fs.writeFileSync(SAMPLE_NWK, data.originalData.mainDataArr[0].fileData, 'utf8');

(async () => {
  const browser = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/normalTree.html', {waitUntil:'load', timeout:30000});
  
  const treeData = fs.readFileSync(SAMPLE_NWK, 'utf8');
  await page.evaluate((payload) => {
    window.normalTree.onLoadNewFile(payload.treeData, 'local', payload.fileName);
  }, {treeData, fileName: path.basename(SAMPLE_NWK)});
  
  await new Promise(r => setTimeout(r, 2000));
  
  const result = await page.evaluate(() => {
    try {
      window.normalTree.styleData.collapseCladeList = [{ nodeIndex: 1, newNodeID: "test" }];
      // wait, `f` in mainplot.ts is captured as `this` from `MainPlot` instantiation.
      // So `f` is `window.normalTree`.
      // `handleClickMethods` has closure over `f`. So we can just call it.
      window.normalTree.handleClickMethods.unfoldAllClades();
      return window.normalTree.styleData.collapseCladeList.length;
    } catch(e) { return e.stack; }
  });
  console.log('Result:', result);
  await browser.close();
  fs.unlinkSync(SAMPLE_NWK);
})();
