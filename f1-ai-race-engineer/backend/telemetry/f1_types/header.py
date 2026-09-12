import struct

# F1 26 Packet Header Definition (Expected)
# struct PacketHeader
# {
#     uint16    m_packetFormat;             // 2026
#     uint8     m_gameYear;                 // Game year - last two digits e.g. 26
#     uint8     m_gameMajorVersion;         // Game major version - "X.00"
#     uint8     m_gameMinorVersion;         // Game minor version - "1.XX"
#     uint8     m_packetVersion;            // Version of this packet type, all start from 1
#     uint8     m_packetId;                 // Identifier for the packet type, see below
#     uint64    m_sessionUID;               // Unique identifier for the session
#     float     m_sessionTime;              // Session timestamp
#     uint32    m_frameIdentifier;          // Identifier for the frame the data was retrieved on
#     uint32    m_playerCarIndex;           // Index of player's car in the array
#     uint8     m_secondaryPlayerCarIndex;  // Index of secondary player's car in the array (splitscreen)
# };

HEADER_FORMAT = "<HBBBBBQfIIB"
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
        "m_playerCarIndex": unpacked[9],
        "m_secondaryPlayerCarIndex": unpacked[10]
    }
