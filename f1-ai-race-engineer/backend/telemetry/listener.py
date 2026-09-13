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
        # Use a small timeout instead of non-blocking to work well with run_in_executor
        self.sock.settimeout(0.1)
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
                # run_in_executor avoids ProactorEventLoop UDP issues on Windows
                data, addr = await loop.run_in_executor(None, self.sock.recvfrom, 2048)
                if data:
                    # Pass the raw binary data to the callback
                    callback(data)
            except socket.timeout:
                pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Ignore closed socket errors when stopping
                if self.is_listening:
                    logger.error(f"Error receiving UDP packet: {e}")
            
            # Yield control back to event loop
            await asyncio.sleep(0)

