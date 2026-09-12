import struct

# CarSetupData:
# uint8 m_frontWing; uint8 m_rearWing; uint8 m_onThrottle; uint8 m_offThrottle;
# float m_frontCamber; float m_rearCamber; float m_frontToe; float m_rearToe;
# uint8 m_frontSuspension; uint8 m_rearSuspension; uint8 m_frontAntiRollBar; uint8 m_rearAntiRollBar;
# uint8 m_frontSuspensionHeight; uint8 m_rearSuspensionHeight; uint8 m_brakePressure; uint8 m_brakeBias;
# uint8 m_engineBraking;
# float m_rearLeftTyrePressure; float m_rearRightTyrePressure; float m_frontLeftTyrePressure; float m_frontRightTyrePressure;
# uint8 m_ballast; float m_fuelLoad;
CAR_SETUP_FORMAT = "<BBBBffffBBBBBBBBBffffBf"
CAR_SETUP_SIZE = struct.calcsize(CAR_SETUP_FORMAT) # 49 bytes per car

# PacketCarSetupData: Header (29) + 24 * CarSetup (1176) + float m_nextFrontWingValue (4)
def unpack_car_setups(data: bytes, header_size: int = 29):
    setups = []
    offset = header_size
    for _ in range(24):
        unpacked = struct.unpack(CAR_SETUP_FORMAT, data[offset:offset+CAR_SETUP_SIZE])
        setups.append({
            "m_frontWing": unpacked[0],
            "m_rearWing": unpacked[1],
            "m_onThrottle": unpacked[2],
            "m_offThrottle": unpacked[3],
            "m_frontCamber": unpacked[4],
            "m_rearCamber": unpacked[5],
            "m_frontToe": unpacked[6],
            "m_rearToe": unpacked[7],
            "m_frontSuspension": unpacked[8],
            "m_rearSuspension": unpacked[9],
            "m_frontAntiRollBar": unpacked[10],
            "m_rearAntiRollBar": unpacked[11],
            "m_frontSuspensionHeight": unpacked[12],
            "m_rearSuspensionHeight": unpacked[13],
            "m_brakePressure": unpacked[14],
            "m_brakeBias": unpacked[15],
            "m_engineBraking": unpacked[16],
            "m_rearLeftTyrePressure": unpacked[17],
            "m_rearRightTyrePressure": unpacked[18],
            "m_frontLeftTyrePressure": unpacked[19],
            "m_frontRightTyrePressure": unpacked[20],
            "m_ballast": unpacked[21],
            "m_fuelLoad": unpacked[22]
        })
        offset += CAR_SETUP_SIZE
        
    next_front_wing = struct.unpack("<f", data[offset:offset+4])[0]
    return setups, next_front_wing
