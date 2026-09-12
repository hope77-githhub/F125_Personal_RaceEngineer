import ctypes
import logging
from .header import PacketHeader
from .car_setup import PacketCarSetupData
from .car_telemetry import PacketCarTelemetryData
from .lap_data import PacketLapData
from .car_damage import PacketCarDamageData

logger = logging.getLogger(__name__)

# Map packet IDs to their corresponding ctypes structures
PACKET_TYPES = {
    2: PacketLapData,
    5: PacketCarSetupData,
    6: PacketCarTelemetryData,
    10: PacketCarDamageData,
}

def parse_packet(data: bytes):
    """
    Reads the first 29 bytes to determine packet ID,
    then parses the entire byte array into the correct ctypes Structure.
    """
    if len(data) < 29:
        return None, None
        
    # Read just the header first
    header = PacketHeader.from_buffer_copy(data[:29])
    packet_id = header.m_packetId
    
    # Check if we support this packet type
    if packet_id in PACKET_TYPES:
        packet_class = PACKET_TYPES[packet_id]
        if len(data) >= ctypes.sizeof(packet_class):
            try:
                # Magic: Map the raw bytes directly to the Python object!
                packet = packet_class.from_buffer_copy(data)
                return packet_id, packet
            except Exception as e:
                logger.error(f"Failed to parse packet ID {packet_id}: {e}")
                return packet_id, None
    
    return packet_id, None
