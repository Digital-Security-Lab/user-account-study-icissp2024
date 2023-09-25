ID_INDEX = 0
DEVICES_INDEX = 10

GOOGLE_INDEX = 22
APPLE_INDEX = 22

DEVICES = ["p1", "p2", "p3", "c1", "c2", "c3", "t1", "t2","sw1", "sw2", "s1", "s2"]


def parse_number(val):
    if val == "None":
        return 0
    elif val == "4 or more":
        return 4
    else:
        return int(val)


def parse_index(row):
    return row[ID_INDEX]

def parse_devices(row):
    devices = []
    num_phone = 0
    num_computer = 0
    num_tablet = 0
    num_smart_watch = 0
    num_security_key = 0
    
    devices.append({"id": "mem1", "label": "Memory"})
    devices.append({"id": "pap1", "label": "Paper"})

    for i in range(12):
        if not row[DEVICES_INDEX+i] == "":
            device_label = ""
            if row[DEVICES_INDEX+i][0] == "p":
                num_phone += 1
                device_label = "Phone {}".format(num_phone)
            elif row[DEVICES_INDEX+i][0] == "c":
                num_computer += 1
                device_label = "Computer {}".format(num_computer)
            elif row[DEVICES_INDEX+i][0] == "t":
                num_tablet += 1
                device_label = "Tablet {}".format(num_tablet)
            elif row[DEVICES_INDEX+i][0:2] == "sw":
                num_smart_watch += 1
                device_label = "SmartWatch {}".format(num_smart_watch)
            elif row[DEVICES_INDEX+i][0] == "s":
                num_security_key += 1
                device_label = "SecKey {}".format(num_security_key)
            devices.append(
                {"id": row[DEVICES_INDEX+i], "label": device_label})

    return devices


def parse_device_selection(row, start_index, num):
    devices = []
    for i in range(num):
        if not row[start_index+i] == "":
            devices.append(row[start_index+i])
    return devices


def parse_password_access(row, start_index):
    MEMORY_INDEX = start_index
    PASSWORD_MANAGER_INDEX = start_index+1
    DEVICE_STORE_INDEX = start_index+2
    PAPER_INDEX = start_index+3
    PASSWORD_MANAGER_DEVICES_INDEX = start_index+4
    DEVICE_STORE_DEVICES_INDEX = start_index+12

    password_access = {"nodeId": "password", "devices": []}
    if not row[MEMORY_INDEX] == "":
        password_access["devices"].append("mem1")
    if not row[PAPER_INDEX] == "":
        password_access["devices"].append("pap1")

    if not row[PASSWORD_MANAGER_INDEX] == "":
        password_access["devices"] += parse_device_selection(
            row, PASSWORD_MANAGER_DEVICES_INDEX, 8)
    if not row[DEVICE_STORE_INDEX] == "":
        password_access["devices"] += parse_device_selection(
            row, DEVICE_STORE_DEVICES_INDEX, 8)
    password_access["devices"] = list(dict.fromkeys(password_access["devices"]))
    return password_access


def parse_Google_account(row):
    deviceList = parse_devices(row)
    auth_nodes = []
    second_factor = False

    PASSWORD_ACCESS_INDEX = GOOGLE_INDEX+1
    SECOND_FACTOR_ENABLED_INDEX = GOOGLE_INDEX+21
    SIGN_IN_BY_PHONE_ENABLED = GOOGLE_INDEX+22
    SIGN_IN_BY_PHONE_DEVICES_INDEX = GOOGLE_INDEX+23  # 5
    SECOND_FACTOR_METHODS_INDEX = GOOGLE_INDEX+26

    GOOGLE_PROMPTS_DEVICES_INDEX = GOOGLE_INDEX+31  # 0
    AUTHENTICATOR_APP_DEVICES_INDEX = GOOGLE_INDEX+36  # 1
    PHONE_DEVICES_INDEX = GOOGLE_INDEX+44  # 3
    SECURITY_KEY_DEVICES_INDEX = GOOGLE_INDEX+47  # 4

    RECOVERY_METHODS_INDEX = GOOGLE_INDEX+57
    RECOVERY_PHONE_DEVICES_INDEX = GOOGLE_INDEX+59

    # Password access
    auth_nodes.append(parse_password_access(row, PASSWORD_ACCESS_INDEX))

    # Second factor
    if row[SECOND_FACTOR_ENABLED_INDEX] == "yes":
        second_factor = True

    # Sign in by phone
    if not second_factor:
        if row[SIGN_IN_BY_PHONE_ENABLED] == "yes":
            devices = parse_device_selection(
                row, SIGN_IN_BY_PHONE_DEVICES_INDEX, 3)
            auth_nodes.append({"nodeId":"sign_in_phone", "devices": devices})
    else:
        for i in range(5):
            if not row[SECOND_FACTOR_METHODS_INDEX+i] == "":
                # parse devices
                devices = []
                if i == 0:
                    devices = parse_device_selection(
                        row, GOOGLE_PROMPTS_DEVICES_INDEX, 5)
                elif i == 1:
                    devices = parse_device_selection(
                        row, AUTHENTICATOR_APP_DEVICES_INDEX, 8)
                elif i == 3:
                    devices = parse_device_selection(
                        row, PHONE_DEVICES_INDEX, 3)
                elif i == 4:
                    devices = parse_device_selection(
                        row, SECURITY_KEY_DEVICES_INDEX, 10)
                auth_nodes.append(
                    {"nodeId": row[SECOND_FACTOR_METHODS_INDEX+i], "devices": devices})

    for i in range(2):
        if not row[RECOVERY_METHODS_INDEX+i] == "":
            devices = []
            if i == 0:
                devices = parse_device_selection(
                    row, RECOVERY_PHONE_DEVICES_INDEX, 3)

            auth_nodes.append(
                {"nodeId": row[RECOVERY_METHODS_INDEX+i], "devices": devices})

    return {"auth_nodes": auth_nodes, "devices": deviceList}


def parse_Apple_account(row):
    deviceList = parse_devices(row)
    auth_nodes = []
    #secondary_methods = []
    #fallback_methods = []

    PASSWORD_ACCESS_INDEX = APPLE_INDEX+1
    TRUSTED_PHONE_NUMBERS_INDEX = APPLE_INDEX+21
    TRUSTED_DEVICES_INDEX = APPLE_INDEX+24
    RECOVERY_METHODS_INDEX = APPLE_INDEX+36

    auth_nodes.append(parse_password_access(row, PASSWORD_ACCESS_INDEX))

    trusted_devices = parse_device_selection(
        row, TRUSTED_DEVICES_INDEX, 10)
    if len(trusted_devices) > 0:
        auth_nodes.append({"nodeId": "trusted_device", "devices": trusted_devices})

    trusted_phones = parse_device_selection(
        row, TRUSTED_PHONE_NUMBERS_INDEX, 3)
    if len(trusted_phones) > 0:
         auth_nodes.append({"nodeId": "trusted_phone_number", "devices": trusted_phones})

    if not row[RECOVERY_METHODS_INDEX+1] == "":
        #devices = []
        auth_nodes.append({"nodeId": "fallback_recovery_key", "devices": ["pap2"]})
        deviceList.append({"id":"pap2", "label": "Paper"})
    elif len(trusted_devices) > 0:
        auth_nodes.append({"nodeId": "fallback_device", "devices": trusted_devices})

    return {"auth_nodes": auth_nodes, "devices": deviceList}
