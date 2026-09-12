import ctypes
from .header import PacketHeader

class CarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_tractionControl", ctypes.c_uint8),
        ("m_antiLockBrakes", ctypes.c_uint8),
        ("m_fuelMix", ctypes.c_uint8),
        ("m_frontBrakeBias", ctypes.c_uint8),
        ("m_pitLimiterStatus", ctypes.c_uint8),
        ("m_fuelInTank", ctypes.c_float),
        ("m_fuelCapacity", ctypes.c_float),
        ("m_fuelRemainingLaps", ctypes.c_float),
        ("m_maxRPM", ctypes.c_uint16),
        ("m_idleRPM", ctypes.c_uint16),
        ("m_maxGears", ctypes.c_uint8),
        ("m_drsAllowed", ctypes.c_uint8),
        ("m_drsActivationDistance", ctypes.c_uint16),
        ("m_actualTyreCompound", ctypes.c_uint8),
        ("m_visualTyreCompound", ctypes.c_uint8),
        ("m_tyresAgeLaps", ctypes.c_uint8),
        ("m_vehicleFiaFlags", ctypes.c_int8),
        ("m_enginePowerICE", ctypes.c_float),
        ("m_enginePowerMGUK", ctypes.c_float),
        ("m_ersStoreEnergy", ctypes.c_float),
        ("m_ersDeployMode", ctypes.c_uint8),
        ("m_ersHarvestedThisLapMGUK", ctypes.c_float),
        ("m_ersHarvestedThisLapMGUH", ctypes.c_float),
        ("m_ersHarvestLimitPerLap", ctypes.c_float),
        ("m_ersDeployedThisLap", ctypes.c_float),
        ("m_networkPaused", ctypes.c_uint8),
    ]

class PacketCarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carStatusData", CarStatusData * 24),
    ]
