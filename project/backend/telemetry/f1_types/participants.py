import ctypes
from .header import PacketHeader

class LiveryColour(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("red", ctypes.c_uint8),
        ("green", ctypes.c_uint8),
        ("blue", ctypes.c_uint8),
    ]

class ParticipantData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_aiControlled", ctypes.c_uint8),
        ("m_driverId", ctypes.c_uint16),
        ("m_networkId", ctypes.c_uint16),
        ("m_teamId", ctypes.c_uint16),
        ("m_myTeam", ctypes.c_uint8),
        ("m_raceNumber", ctypes.c_uint8),
        ("m_nationality", ctypes.c_uint8),
        ("m_name", ctypes.c_char * 32),
        ("m_yourTelemetry", ctypes.c_uint8),
        ("m_showOnlineNames", ctypes.c_uint8),
        ("m_techLevel", ctypes.c_uint16),
        ("m_platform", ctypes.c_uint8),
        ("m_numColours", ctypes.c_uint8),
        ("m_liveryColours", LiveryColour * 4),
    ]

class PacketParticipantsData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_numActiveCars", ctypes.c_uint8),
        ("m_participants", ParticipantData * 24),
    ]
