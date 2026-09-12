import struct

# Size: 29 bytes
HEADER_FORMAT = "<HBBBBBQfIIBB"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)

def unpack_header(data: bytes):
    if len(data) < HEADER_SIZE:
        return None
    
    unpacked = struct.unpack(HEADER_FORMAT, data[:HEADER_SIZE])
    return {
        "m_packetFormat": unpacked[0],
        "m_gameYear": unpacked[1],
        "m_gameMajorVersion": unpacked[2],
        "m_gameMinorVersion": unpacked[3],
        "m_packetVersion": unpacked[4],
        "m_packetId": unpacked[5],
        "m_sessionUID": unpacked[6],
        "m_sessionTime": unpacked[7],
        "m_frameIdentifier": unpacked[8],
        "m_overallFrameIdentifier": unpacked[9],
        "m_playerCarIndex": unpacked[10],
        "m_secondaryPlayerCarIndex": unpacked[11]
    }
