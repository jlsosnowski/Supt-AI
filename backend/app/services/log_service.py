logs = []

def add_log(entry: dict):
    logs.append(entry)

def get_logs():
    return logs

def clear_logs():
    logs.clear()
    