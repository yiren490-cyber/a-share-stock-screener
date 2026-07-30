const assert = require("assert");
const fs = require("fs");
const path = require("path");

const watch = require("../assets/watch.js");
const watchHtml = fs.readFileSync(path.join(__dirname, "..", "watch.html"), "utf8");

assert(watchHtml.includes('id="watchManageCategoryButton"'), "watch page should show a manage-category button in the stock group header");
assert(watchHtml.includes('id="watchManageCategoryModal"'), "watch page should include a manage-category modal");
assert(watchHtml.includes('id="watchManageCategoryList"'), "watch manage modal should include a category list");
assert(watchHtml.includes('id="watchSaveManagedCategoryButton"'), "watch manage modal should support adding a new group");

const saved = {};
const storage = {
  setItem(key, value) {
    saved[key] = value;
  },
};

const renamed = watch.renameCategoryGroupForStorage(storage, { A: ["sh600519", "sz000001"], B: ["sz000001", "bj430047"] }, "A", "B");
assert.deepStrictEqual(renamed, { B: ["sz000001", "bj430047", "sh600519"] }, "renaming to an existing group should merge stocks without duplicates");
assert.strictEqual(saved.aShareCategories, JSON.stringify(renamed), "renaming from watch should persist to the shared category key");

const removed = watch.removeSymbolFromCategoryForStorage(storage, { A: ["sh600519", "sz000001"], B: ["bj430047"] }, "A", "600519");
assert.deepStrictEqual(removed, { A: ["sz000001"], B: ["bj430047"] }, "watch manage modal should remove a normalized stock from one group");
assert.strictEqual(saved.aShareCategories, JSON.stringify(removed), "removing a stock from watch should persist to the shared category key");

const created = watch.addManagedCategoryForStorage(storage, { A: ["sh600519"] }, " 新分组 ");
assert.deepStrictEqual(created, { A: ["sh600519"], 新分组: [] }, "watch manage modal should create an empty group");
assert.strictEqual(saved.aShareCategories, JSON.stringify(created), "creating a group from watch should persist to the shared category key");

console.log("watch management tests passed");
