"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPropertyNode = exports.isPathNode = exports.isNode = void 0;
function isNode(node) {
    return typeof node !== "string";
}
exports.isNode = isNode;
function isPathNode(node) {
    return typeof node !== "string" && node.type === "path";
}
exports.isPathNode = isPathNode;
function isPropertyNode(node) {
    return typeof node !== "string" && node.type === "property";
}
exports.isPropertyNode = isPropertyNode;
