import ctypes
from .header import PacketHeader

class CarDamageData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_tyresWear", ctypes.c_float * 4),
        ("m_tyresDamage", ctypes.c_uint8 * 4),
        ("m_brakesDamage", ctypes.c_uint8 * 4),
        ("m_tyreBlisters", ctypes.c_uint8 * 4),
        ("m_frontLeftWingDamage", ctypes.c_uint8),
        ("m_frontRightWingDamage", ctypes.c_uint8),
        ("m_rearWingDamage", ctypes.c_uint8),
        ("m_floorDamage", ctypes.c_uint8),
        ("m_diffuserDamage", ctypes.c_uint8),
        ("m_sidepodDamage", ctypes.c_uint8),
        ("m_drsFault", ctypes.c_uint8),
        ("m_ersFault", ctypes.c_uint8),
        ("m_gearBoxDamage", ctypes.c_uint8),
        ("m_engineDamage", ctypes.c_uint8),
        ("m_engineMGUHWear", ctypes.c_uint8),
        ("m_engineESWear", ctypes.c_uint8),
        ("m_engineCEWear", ctypes.c_uint8),
        ("m_engineICEWear", ctypes.c_uint8),
        ("m_engineMGUKWear", ctypes.c_uint8),
        ("m_engineTCWear", ctypes.c_uint8),
        ("m_engineBlown", ctypes.c_uint8),
        ("m_engineSeized", ctypes.c_uint8),
    ]

class PacketCarDamageData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ("m_header", PacketHeader),
        ("m_carDamageData", CarDamageData * 24),
    ]
