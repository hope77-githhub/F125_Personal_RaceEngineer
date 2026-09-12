import struct

# CarTelemetryData:
# uint16 m_speed; float m_throttle; float m_steer; float m_brake; uint8 m_clutch; int8 m_gear; uint16 m_engineRPM;
# uint8 m_drs; uint8 m_revLightsPercent; uint16 m_revLightsBitValue;
# uint16 m_brakesTemperature[4]; uint8 m_tyresSurfaceTemperature[4]; uint8 m_tyresInnerTemperature[4];
# uint8 m_engineTemperature; float m_tyresPressure[4]; uint8 m_surfaceType[4];
CAR_TELEMETRY_FORMAT = "<HfffBbHBBH HHHH BBBB BBBB B ffff BBBB"
CAR_TELEMETRY_SIZE = struct.calcsize(CAR_TELEMETRY_FORMAT) # 59 bytes per car

# PacketCarTelemetryData: Header (29) + 24 * CarTelemetryData (1416) + 3 bytes (m_mfdPanelIndex, m_mfdPanelIndexSecondaryPlayer, m_suggestedGear)
def unpack_car_telemetry(data: bytes, header_size: int = 29):
    telemetry = []
    offset = header_size
    for _ in range(24):
        unpacked = struct.unpack(CAR_TELEMETRY_FORMAT, data[offset:offset+CAR_TELEMETRY_SIZE])
        telemetry.append({
            "m_speed": unpacked[0],
            "m_throttle": unpacked[1],
            "m_steer": unpacked[2],
            "m_brake": unpacked[3],
            "m_clutch": unpacked[4],
            "m_gear": unpacked[5],
            "m_engineRPM": unpacked[6],
            "m_drs": unpacked[7],
            "m_revLightsPercent": unpacked[8],
            "m_revLightsBitValue": unpacked[9],
            "m_brakesTemperature": list(unpacked[10:14]),
            "m_tyresSurfaceTemperature": list(unpacked[14:18]),
            "m_tyresInnerTemperature": list(unpacked[18:22]),
            "m_engineTemperature": unpacked[22],
            "m_tyresPressure": list(unpacked[23:27]),
            "m_surfaceType": list(unpacked[27:31])
        })
        offset += CAR_TELEMETRY_SIZE
        
    panels_and_gear = struct.unpack("<BBb", data[offset:offset+3])
    return telemetry, {
        "m_mfdPanelIndex": panels_and_gear[0],
        "m_mfdPanelIndexSecondaryPlayer": panels_and_gear[1],
        "m_suggestedGear": panels_and_gear[2]
    }
