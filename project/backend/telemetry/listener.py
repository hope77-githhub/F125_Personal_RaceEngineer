import socket
import asyncio
import logging

logger = logging.getLogger(__name__)


class F1UDPListener:
    def __init__(self, host='0.0.0.0', port=20777, update_rate=60):
        self.host = host
        self.port = port
        self.update_rate = update_rate
        self.sock = None
        self.is_listening = False

    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            # 4 MB receive buffer to prevent packet drops during 60Hz multi-packet bursts
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
        except Exception as e:
            logger.warning(f"Could not set SO_RCVBUF to 4MB: {e}")
        self.sock.bind((self.host, self.port))
        self.sock.setblocking(False)
        self.is_listening = True
        logger.info(f"F1 UDP Listener started on {self.host}:{self.port} at {self.update_rate}Hz")

    def stop(self):
        self.is_listening = False
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
            logger.info("F1 UDP Listener stopped.")

    async def listen(self, callback):
        while self.is_listening:
            drained = 0
            try:
                # Drain all queued UDP datagrams in the kernel buffer without blocking
                while self.is_listening and self.sock and drained < 128:
                    try:
                        data, _ = self.sock.recvfrom(4096)
                        if data:
                            callback(data)
                            drained += 1
                    except (BlockingIOError, socket.timeout):
                        break
            except asyncio.CancelledError:
                break
            except Exception as e:
                if self.is_listening:
                    logger.error(f"Error receiving UDP packet: {e}")

            await asyncio.sleep(0.004 if drained == 0 else 0)
