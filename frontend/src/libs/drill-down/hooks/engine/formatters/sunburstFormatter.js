export function formatSunburstData(node, limit) {
    if (!node || !node.children || node.children.length === 0) {
        return [];
    }
    function convert(n, depth) {
        if (!n) return null;

        const hasChildren = n.children && n.children.length > 0;

        return {
            name: n.name,
            value: n.value,
            sum: n.value * n.count,
            count: n.count,
            children: hasChildren
                ? n.children.slice(0, depth === 0 ? limit : 30).map(c => convert(c, depth + 1))
                : undefined,
        };
    }

    return node.children.slice(0, limit).map(c => convert(c, 0));
}
