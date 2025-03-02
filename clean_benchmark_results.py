#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import argparse
from pathlib import Path


def clean_benchmark_results(base_dir="tmp.benchmarks"):
    """
    遍历指定目录下的所有文件夹，查找并删除符合条件的.aider.results.json文件

    参数:
        base_dir: 基础目录路径，默认为"tmp.benchmarks"
    """
    base_path = Path(base_dir)

    if not base_path.exists() or not base_path.is_dir():
        print(f"错误: 目录 {base_dir} 不存在或不是一个文件夹")
        return

    # 遍历基础目录下的所有子目录
    for subdir in base_path.iterdir():
        if not subdir.is_dir():
            continue

        print(f"正在检查目录: {subdir}")
        process_directory(subdir)


def process_directory(directory):
    """
    处理指定目录及其子目录中的.aider.results.json文件

    参数:
        directory: 要处理的目录路径
    """
    # 递归遍历目录
    found_files = False
    for path in directory.glob("**/*.aider.results.json"):
        found_files = True
        try:
            print(f"发现文件: {path}")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # 打印num_user_asks和test_timeouts的值以便调试
            num_asks = data.get("num_user_asks", "未找到")
            test_timeouts = data.get("test_timeouts", "未找到")
            print(f"num_user_asks值: {num_asks}")
            print(f"test_timeouts值: {test_timeouts}")

            # 检查num_user_asks或test_timeouts字段，确保值不为0
            if ("num_user_asks" in data and data["num_user_asks"] != 0) or (
                "test_timeouts" in data and data["test_timeouts"] != 0
            ):
                # 构建对应的.aider.chat.history.md文件路径
                history_file = path.parent / ".aider.chat.history.md"

                # 询问用户是否确认删除
                print(f"\n发现需要删除的文件:")
                print(f"  - {path}")
                if history_file.exists():
                    print(f"  - {history_file}")

                confirm = input(f"确认删除以上文件? (y/n): ").strip().lower()
                if confirm == "y":
                    # 删除.aider.results.json文件
                    os.remove(path)
                    print(f"已删除文件: {path}")

                    # 如果存在对应的.aider.chat.history.md文件，也删除它
                    if history_file.exists():
                        os.remove(history_file)
                        print(f"已删除文件: {history_file}")

                    print(f"已从目录 {path.parent} 中删除文件")
                else:
                    print("已跳过删除")
            else:
                print(
                    f"跳过文件 {path} (num_user_asks = {num_asks}, test_timeouts = {test_timeouts})"
                )
        except json.JSONDecodeError:
            print(f"警告: 无法解析JSON文件: {path}")
        except Exception as e:
            print(f"处理文件 {path} 时出错: {str(e)}")

    if not found_files:
        print(f"在目录 {directory} 及其子目录中未找到任何 .aider.results.json 文件")


def main():
    parser = argparse.ArgumentParser(description="清理benchmark结果文件")
    parser.add_argument("--dir", default="tmp.benchmarks", help="要处理的基础目录")
    parser.add_argument(
        "--subdir", help="只处理指定的子目录(例如: 2025-02-27-deepclaude37-rust)"
    )
    parser.add_argument(
        "--path",
        help="指定完整的基础目录路径(例如: /Users/xiaoyuanhang/Desktop/aider/aider/tmp.benchmarks)",
    )

    args = parser.parse_args()

    # 如果提供了完整路径，则使用它
    if args.path:
        base_dir = Path(args.path)
    else:
        # 获取当前工作目录
        current_dir = Path.cwd()
        base_dir = Path(args.dir)

        # 如果base_dir不是绝对路径，则将其视为相对于当前工作目录的路径
        if not base_dir.is_absolute():
            base_dir = current_dir / base_dir

    print(f"使用基础目录: {base_dir}")

    if args.subdir:
        # 只处理指定的子目录
        target_dir = base_dir / args.subdir
        if not target_dir.exists():
            print(f"错误: 目录 {target_dir} 不存在")
            return

        if not target_dir.is_dir():
            print(f"错误: {target_dir} 不是一个文件夹")
            return

        print(f"正在检查指定目录: {target_dir}")
        process_directory(target_dir)
    else:
        # 处理所有子目录
        if not base_dir.exists():
            print(f"错误: 目录 {base_dir} 不存在")
            return

        if not base_dir.is_dir():
            print(f"错误: {base_dir} 不是一个文件夹")
            return

        clean_benchmark_results(base_dir)

    print("处理完成")


if __name__ == "__main__":
    main()
