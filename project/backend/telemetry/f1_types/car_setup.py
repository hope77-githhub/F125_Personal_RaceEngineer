import ctypes
from .header import PacketHeader

class CarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_frontWing", ctypes.c_uint8),
        ("m_rearWing", ctypes.c_uint8),
        ("m_onThrottle", ctypes.c_uint8),
        ("m_offThrottle", ctypes.c_uint8),
        ("m_frontCamber", ctypes.c_float),
        ("m_rearCamber", ctypes.c_float),
        ("m_frontToe", ctypes.c_float),
        ("m_rearToe", ctypes.c_float),
        ("m_frontSuspension", ctypes.c_uint8),
        ("m_rearSuspension", ctypes.c_uint8),
        ("m_frontAntiRollBar", ctypes.c_uint8),
        ("m_rearAntiRollBar", ctypes.c_uint8),
        ("m_frontSuspensionHeight", ctypes.c_uint8),
        ("m_rearSuspensionHeight", ctypes.c_uint8),
        ("m_brakePressure", ctypes.c_uint8),
        ("m_brakeBias", ctypes.c_uint8),
        ("m_engineBraking", ctypes.c_uint8),
        ("m_rearLeftTyrePressure", ctypes.c_float),
        ("m_rearRightTyrePressure", ctypes.c_float),
        ("m_frontLeftTyrePressure", ctypes.c_float),
        ("m_frontRightTyrePressure", ctypes.c_float),
        ("m_ballast", ctypes.c_uint8),
        ("m_fuelLoad", ctypes.c_float),
    ]

class PacketCarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carSetups", CarSetupData * 24),
        ("m_nextFrontWingValue", ctypes.c_float),
    ]
