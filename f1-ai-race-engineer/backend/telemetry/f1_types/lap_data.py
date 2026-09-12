import ctypes
from .header import PacketHeader

class LapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_lastLapTimeInMS", ctypes.c_uint32),
        ("m_currentLapTimeInMS", ctypes.c_uint32),
        ("m_sector1TimeMSPart", ctypes.c_uint16),
        ("m_sector1TimeMinutesPart", ctypes.c_uint8),
        ("m_sector2TimeMSPart", ctypes.c_uint16),
        ("m_sector2TimeMinutesPart", ctypes.c_uint8),
        ("m_deltaToCarInFrontMSPart", ctypes.c_uint16),
        ("m_deltaToCarInFrontMinutesPart", ctypes.c_uint8),
        ("m_deltaToRaceLeaderMSPart", ctypes.c_uint16),
        ("m_deltaToRaceLeaderMinutesPart", ctypes.c_uint8),
        ("m_lapDistance", ctypes.c_float),
        ("m_totalDistance", ctypes.c_float),
        ("m_safetyCarDelta", ctypes.c_float),
        ("m_carPosition", ctypes.c_uint8),
        ("m_currentLapNum", ctypes.c_uint8),
        ("m_pitStatus", ctypes.c_uint8),
        ("m_numPitStops", ctypes.c_uint8),
        ("m_sector", ctypes.c_uint8),
        ("m_currentLapInvalid", ctypes.c_uint8),
        ("m_penalties", ctypes.c_uint8),
        ("m_totalWarnings", ctypes.c_uint8),
        ("m_cornerCuttingWarnings", ctypes.c_uint8),
        ("m_numUnservedDriveThroughPens", ctypes.c_uint8),
        ("m_numUnservedStopGoPens", ctypes.c_uint8),
        ("m_gridPosition", ctypes.c_uint8),
        ("m_driverStatus", ctypes.c_uint8),
        ("m_resultStatus", ctypes.c_uint8),
        ("m_pitLaneTimerActive", ctypes.c_uint8),
        ("m_pitLaneTimeInLaneInMS", ctypes.c_uint16),
        ("m_pitStopTimerInMS", ctypes.c_uint16),
        ("m_pitStopShouldServePen", ctypes.c_uint8),
        ("m_speedTrapFastestSpeed", ctypes.c_float),
        ("m_speedTrapFastestLap", ctypes.c_uint8),
    ]

class PacketLapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_lapData", LapData * 24),
        ("m_timeTrialPBCarIdx", ctypes.c_uint8),
        ("m_timeTrialRivalCarIdx", ctypes.c_uint8),
    ]
