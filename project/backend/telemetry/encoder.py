"""
Recorded packet dict -> raw F1 UDP bytes.

The raw recorder stores each packet as ctypes_to_dict(parsed ctypes structure). Filling the same
ctypes structure back from that dict gives the binary packet again (2026 layout), which lets the
TV overlay — a separate program that parses raw UDP — run on replays as well as on the live game.
"""
import ctypes

from telemetry.f1_types.router import PACKET_TYPES


def _fill(obj, data):
    for name, ftype in obj._fields_:
        if name not in data:
            continue
        _assign(obj, name, ftype, data[name])


def _assign(obj, name, ftype, value):
    if isinstance(ftype, type) and issubclass(ftype, ctypes.Structure):
        if isinstance(value, dict):
            _fill(getattr(obj, name), value)
        return
    if isinstance(ftype, type) and issubclass(ftype, ctypes.Array):
        arr = getattr(obj, name)
        etype = ftype._type_
        if etype is ctypes.c_char:
            raw = value.encode("utf-8", errors="ignore") if isinstance(value, str) else bytes(value or b"")
            setattr(obj, name, raw[: ftype._length_])
            return
        if not isinstance(value, (list, tuple)):
            return
        for i, item in enumerate(value[: ftype._length_]):
            if isinstance(etype, type) and issubclass(etype, ctypes.Structure):
                if isinstance(item, dict):
                    _fill(arr[i], item)
            else:
                try:
                    arr[i] = item
                except (TypeError, ValueError):
                    pass
        return
    try:
        setattr(obj, name, value)
    except (TypeError, ValueError):
        pass


def encode_packet(packet_id, data):
    """bytes for one recorded packet dict, or None if the packet type is unknown / data malformed."""
    cls = PACKET_TYPES.get(int(packet_id))
    if cls is None or not isinstance(data, dict):
        return None
    pkt = cls()
    try:
        _fill(pkt, data)
    except Exception:
        return None
    return bytes(pkt)
