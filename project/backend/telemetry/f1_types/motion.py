import ctypes
from .header import PacketHeader


class CarMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_worldPositionX", ctypes.c_float),
        ("m_worldPositionY", ctypes.c_float),
        ("m_worldPositionZ", ctypes.c_float),
        ("m_worldVelocityX", ctypes.c_float),
        ("m_worldVelocityY", ctypes.c_float),
        ("m_worldVelocityZ", ctypes.c_float),
        ("m_worldForwardDirX", ctypes.c_int16),
        ("m_worldForwardDirY", ctypes.c_int16),
        ("m_worldForwardDirZ", ctypes.c_int16),
        ("m_worldRightDirX", ctypes.c_int16),
        ("m_worldRightDirY", ctypes.c_int16),
        ("m_worldRightDirZ", ctypes.c_int16),
        ("m_gForceLateral", ctypes.c_int16),
        ("m_gForceLongitudinal", ctypes.c_int16),
        ("m_gForceVertical", ctypes.c_int16),
        ("m_yaw", ctypes.c_float),
        ("m_pitch", ctypes.c_float),
        ("m_roll", ctypes.c_float),
    ]


class PacketMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carMotionData", CarMotionData * 24),
    ]
