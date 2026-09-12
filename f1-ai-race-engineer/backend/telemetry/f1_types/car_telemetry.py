import ctypes
from .header import PacketHeader

class CarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_speed", ctypes.c_uint16),
        ("m_throttle", ctypes.c_float),
        ("m_steer", ctypes.c_float),
        ("m_brake", ctypes.c_float),
        ("m_clutch", ctypes.c_uint8),
        ("m_gear", ctypes.c_int8),
        ("m_engineRPM", ctypes.c_uint16),
        ("m_drs", ctypes.c_uint8),
        ("m_revLightsPercent", ctypes.c_uint8),
        ("m_revLightsBitValue", ctypes.c_uint16),
        ("m_brakesTemperature", ctypes.c_uint16 * 4),
        ("m_tyresSurfaceTemperature", ctypes.c_uint8 * 4),
        ("m_tyresInnerTemperature", ctypes.c_uint8 * 4),
        ("m_engineTemperature", ctypes.c_uint16),
        ("m_tyresPressure", ctypes.c_float * 4),
        ("m_surfaceType", ctypes.c_uint8 * 4),
    ]

class PacketCarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carTelemetryData", CarTelemetryData * 24),
        ("m_mfdPanelIndex", ctypes.c_uint8),
        ("m_mfdPanelIndexSecondaryPlayer", ctypes.c_uint8),
        ("m_suggestedGear", ctypes.c_int8),
    ]
