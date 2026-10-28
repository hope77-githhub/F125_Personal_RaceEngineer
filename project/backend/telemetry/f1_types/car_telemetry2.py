import ctypes
from .header import PacketHeader

class CarTelemetry2Data(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_activeAeroMode", ctypes.c_uint8),
        ("m_activeAeroAvailable", ctypes.c_uint8),
        ("m_activeAeroActivationDistance", ctypes.c_uint16),
        ("m_overtakeAvailable", ctypes.c_uint8),
        ("m_overtakeActive", ctypes.c_uint8),
        ("m_overtakeActivationDistance", ctypes.c_uint16),
        ("m_2026Regulations", ctypes.c_uint8),
        ("m_drivingWrongWay", ctypes.c_uint8),
    ]

class PacketCarTelemetry2Data(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carTelemetry2Data", CarTelemetry2Data * 22),
    ]
