import socket
import struct
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
        self.sock.bind((self.host, self.port))
        self.sock.setblocking(False)
        self.is_listening = True
        logger.info(f"F1 UDP Listener started on {self.host}:{self.port} at {self.update_rate}Hz")

    def stop(self):
        self.is_listening = False
        if self.sock:
            self.sock.close()
            logger.info("F1 UDP Listener stopped.")

    async def listen(self, callback):
        loop = asyncio.get_event_loop()
        while self.is_listening:
            try:
                # Receive up to 2048 bytes (F1 packets are max ~1500 bytes)
                data, addr = await loop.sock_recv(self.sock, 2048)
                if data:
                    # Pass the raw binary data to the callback
                    callback(data)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error receiving UDP packet: {e}")
            
            # Simple rate limiting depending on update_rate setting (approximate)
            await asyncio.sleep(1.0 / self.update_rate)

