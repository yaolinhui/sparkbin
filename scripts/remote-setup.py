#!/usr/bin/env python3
"""
远程服务器测试环境初始化脚本
通过 SSH 连接到生产服务器，完成：
1. 运行冒烟测试
2. 检查 Docker/服务状态
3. 部署 Uptime Kuma
4. 配置 crontab 每日健康检查

使用方法：
  export SPARKBIN_HOST="your-server-ip"
  export SPARKBIN_USER="root"
  export SPARKBIN_PASSWORD="your-password"
  python scripts/remote-setup.py
"""

import os
import paramiko
import sys
import time

HOST = os.environ.get("SPARKBIN_HOST", "")
USERNAME = os.environ.get("SPARKBIN_USER", "root")
PASSWORD = os.environ.get("SPARKBIN_PASSWORD", "")
PROJECT_DIR = "/opt/sparkbin"


def run_cmd(ssh, cmd, description="", timeout=60):
    """执行远程命令并打印输出"""
    if description:
        print(f"\n>>> {description}")
        print(f"    $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(out)
    if err:
        filtered = "\n".join(
            line for line in err.splitlines()
            if not any(x in line for x in ["WARNING", "debconf", "dpkg-preconfigure", "LC_ALL"])
        )
        if filtered:
            print(f"[STDERR] {filtered}", file=sys.stderr)
    return out, err


def connect():
    if not HOST:
        print("[ERROR] 请设置环境变量 SPARKBIN_HOST", file=sys.stderr)
        print("  export SPARKBIN_HOST=\"your-server-ip\"", file=sys.stderr)
        sys.exit(1)
    if not PASSWORD:
        print("[ERROR] 请设置环境变量 SPARKBIN_PASSWORD", file=sys.stderr)
        print("  export SPARKBIN_PASSWORD=\"your-password\"", file=sys.stderr)
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"正在连接 {HOST} ...")
    client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=15,
                   look_for_keys=False, allow_agent=False)
    print("连接成功！\n")
    return client


def step1_smoke_test(ssh):
    print("=" * 60)
    print("步骤 1/4：运行生产环境冒烟测试")
    print("=" * 60)
    run_cmd(ssh, f"cd {PROJECT_DIR} && bash scripts/smoke-test-production.sh",
            description="执行冒烟测试脚本", timeout=120)


def step2_check_services(ssh):
    print("\n" + "=" * 60)
    print("步骤 2/4：检查 Docker 服务状态")
    print("=" * 60)
    run_cmd(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
            description="查看运行中的容器")
    run_cmd(ssh, "docker system df",
            description="Docker 磁盘使用")
    run_cmd(ssh, f"cd {PROJECT_DIR} && docker compose -f docker-compose.deploy.yml logs --tail 20",
            description="查看后端最近 20 行日志", timeout=60)


def step3_uptime_kuma(ssh):
    print("\n" + "=" * 60)
    print("步骤 3/4：部署 Uptime Kuma 监控")
    print("=" * 60)

    out, _ = run_cmd(ssh, "docker ps --format '{{.Names}}' | grep uptime-kuma || true",
                     description="检查 Uptime Kuma 是否已部署")
    if "uptime-kuma" in out:
        print("Uptime Kuma 已部署，跳过")
        run_cmd(ssh, "docker ps | grep uptime-kuma",
                description="确认运行状态")
        return

    print("正在部署 Uptime Kuma（约需 1-2 分钟）...")
    run_cmd(ssh,
            "docker run -d --restart=always --name uptime-kuma -p 3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:1",
            description="启动 Uptime Kuma 容器", timeout=120)

    print("等待 Uptime Kuma 启动...")
    time.sleep(10)

    run_cmd(ssh, "docker ps | grep uptime-kuma",
            description="确认容器运行状态")

    print("\nUptime Kuma 已部署！")
    print(f"访问地址: http://{HOST}:3001")
    print("默认用户名: admin（首次登录会要求设置）")
    print("建议配置的监控项：")
    print("  - https://sparkbin.wanchun.me")
    print("  - https://api-sparkbin.wanchun.me/health")


def step4_crontab(ssh):
    print("\n" + "=" * 60)
    print("步骤 4/4：配置每日定时健康检查")
    print("=" * 60)

    cron_line = f"0 3 * * * cd {PROJECT_DIR} && bash scripts/smoke-test-production.sh >> /var/log/sparkbin-health.log 2>&1"

    out, _ = run_cmd(ssh, "crontab -l 2>/dev/null || true",
                     description="获取当前 crontab")

    if "sparkbin-health" in out:
        print("定时健康检查已配置，跳过")
        return

    new_crontab = (out + "\n" + cron_line).strip() + "\n"
    run_cmd(ssh, f"echo '{new_crontab}' | crontab -",
            description="添加每日 3:00 健康检查任务")

    run_cmd(ssh, "crontab -l | grep sparkbin",
            description="确认 crontab 已生效")

    print("\n已配置每日 03:00 自动运行健康检查")
    print("日志位置: /var/log/sparkbin-health.log")


def main():
    try:
        ssh = connect()
        step1_smoke_test(ssh)
        step2_check_services(ssh)
        step3_uptime_kuma(ssh)
        step4_crontab(ssh)

        print("\n" + "=" * 60)
        print("全部完成！")
        print("=" * 60)
        print(f"Uptime Kuma: http://{HOST}:3001")
        print(f"健康检查日志: /var/log/sparkbin-health.log")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'ssh' in locals():
            ssh.close()
            print("\nSSH 连接已关闭。")


if __name__ == "__main__":
    main()
