import dendropy
import sys

def calculate_gtdb_standard_red(input_tree, output_tree):
    taxa = dendropy.TaxonNamespace()
    try:
        tree = dendropy.Tree.get(
            path=input_tree, 
            schema="newick", 
            taxon_namespace=taxa
        )
    except Exception as e:
        print(f"❌ 读取树文件失败: {e}")
        return

    # 1. 后序遍历：计算每个节点到其后代叶子的平均距离 (b)
    # n_tips: 该节点下的叶子总数
    # sum_dist: 该节点到所有后代叶子的距离总和
    node_stats = {} 

    for node in tree.postorder_node_iter():
        if node.is_leaf():
            node_stats[node] = {'n_tips': 1, 'sum_dist': 0.0}
        else:
            total_tips = 0
            total_dist = 0.0
            for child in node.child_node_iter():
                child_info = node_stats[child]
                edge = child.edge_length if child.edge_length is not None else 0
                total_tips += child_info['n_tips']
                # 距离总和 = 子节点的(距离总和 + 分支长度 * 子节点下的叶子数)
                total_dist += child_info['sum_dist'] + (edge * child_info['n_tips'])
            
            node_stats[node] = {'n_tips': total_tips, 'sum_dist': total_dist}

    # 2. 先序遍历：计算 RED 值
    # 公式: RED = P + (a / (a + b)) * (1 - P)
    for node in tree.preorder_node_iter():
        if node.parent_node is None:
            node.red = 0.0  # 根节点 RED 为 0
        else:
            P = node.parent_node.red
            a = node.edge_length if node.edge_length is not None else 0
            
            # b 是当前节点到其后代叶子的平均距离
            stats = node_stats[node]
            b = stats['sum_dist'] / stats['n_tips'] if stats['n_tips'] > 0 else 0
            
            # GTDB 标准公式逻辑
            if (a + b) == 0:
                node.red = 1.0
            else:
                node.red = P + (a / (a + b)) * (1 - P)
        
        # 将 RED 写入 Label 方便可视化
        if not node.is_leaf():
            node.label = f"{node.red:.4f}"

    # 3. 导出
    tree.write(path=output_tree, schema="newick")
    print(f"✅ 修正完成！标准 RED 树已保存至: {output_tree}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: pixi run python calculate_red.py <input> <output>")
    else:
        calculate_gtdb_standard_red(sys.argv[1], sys.argv[2])
