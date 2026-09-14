import ctypes
from .header import PacketHeader


class LapHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_lapTimeInMS", ctypes.c_uint32),
        ("m_sector1TimeMSPart", ctypes.c_uint16),
        ("m_sector1TimeMinutes", ctypes.c_uint8),
        ("m_sector2TimeMSPart", ctypes.c_uint16),
        ("m_sector2TimeMinutes", ctypes.c_uint8),
        ("m_sector3TimeMSPart", ctypes.c_uint16),
        ("m_sector3TimeMinutes", ctypes.c_uint8),
        ("m_lapValidBitFlags", ctypes.c_uint8),
    ]


class TyreStintHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_endLap", ctypes.c_uint8),
        ("m_tyreActualCompound", ctypes.c_uint8),
        ("m_tyreVisualCompound", ctypes.c_uint8),
    ]


class PacketSessionHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carIdx", ctypes.c_uint8),
        ("m_numLaps", ctypes.c_uint8),
        ("m_numTyreStints", ctypes.c_uint8),
        ("m_bestLapTimeLapNum", ctypes.c_uint8),
        ("m_bestSector1LapNum", ctypes.c_uint8),
        ("m_bestSector2LapNum", ctypes.c_uint8),
        ("m_bestSector3LapNum", ctypes.c_uint8),
        ("m_lapHistoryData", LapHistoryData * 100),
        ("m_tyreStintsHistoryData", TyreStintHistoryData * 8),
    ]
