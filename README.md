# Meter Math

[Open Meter Math](https://coolcode.ca/metermath/) to compare Vancouver's posted hourly meter rates and limits for a whole visit. Select a landmark or enter latitude and longitude. Choose a vehicle, date, arrival, departure and search distance. Compare the estimates, then expand any result for its two rate periods and original city record.

<!-- coolcode:guide -->
Try a Friday from 5:30 to 7 p.m. near the Vancouver Art Gallery. Compare the two featured zones, then expand a meter row to see the charge on either side of 6 p.m. Switch the result group to see which posted limits or restrictions affect the same visit.
<!-- /coolcode:guide -->

## Interpreting estimates

Zone 60223 charges $6.50 per hour before 6 p.m. and $4 afterward in the launch snapshot. Half an hour plus one hour costs $7.25. Zone 67682 charges $2 per hour in both periods, or $3 for the same 90 minutes. The difference is $4.25. These examples change when the City changes its rates.

Distances run directly from the selected coordinates to record points. Vancouver reports rates at block level. A walking route, exact stall location and live availability require additional information. The regular estimates use the city's daily 9 a.m.–10 p.m. metered period, including holidays. Overnight visits can cross midnight. Charges are prorated and rounded once per visit. Payment increments, transaction fees and temporary signs can change a payment. The calculator uses local civil clock times and cannot resolve ambiguous clock-change hours.

The site compares regular spaces and applicable dedicated vehicle spaces. Gas motorcycles paying through PayByPhone receive the half-rate for regular spaces. Dedicated motorcycle spaces require confirmation of the app price. Other motorcycle payment modes and zero-emission motorcycle discounts are outside this calculator. Vehicles with a valid accessibility permit may use either regular or designated accessible spaces.

Weekday and weekend duration limits are evaluated separately. A stay that exceeds the recorded limit in a single band is ruled out. A continuous visit spanning different limits goes to sign review when it exceeds only the shorter limit. Effective timed prohibitions, including overnight restrictions carried in from the prior day, rule out a visit. Incomplete rules, time-limit and prohibition overrides, a matching rush-hour time, and optional flat rates require sign review. Flat-rate terms are absent from the export. A 650 m radius around the stadium centres flags possible event rates or stopping controls. The radius is a screening area and the actual signed event area can differ. Results never infer event dates. Source rows with identical rules and payment-zone numbers are represented by their nearest point.

## Data and development

Contains information licensed under the [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/). The [parking-meter export](https://opendata.vancouver.ca/explore/dataset/parking-meters/) supplies coordinates, rates, limits, vehicle designations and restrictions. The City publishes [meter and event guidance](https://vancouver.ca/streets-transportation/metered-parking.aspx), [metered hours](https://vancouver.ca/streets-transportation/driving.aspx), [motorcycle rates](https://vancouver.ca/streets-transportation/motorcycles-and-scooters.aspx) and [Parking Meter By-law 2952](https://bylaws.vancouver.ca/2952c.pdf). Seven landmark coordinates use the City's [public washroom points](https://opendata.vancouver.ca/explore/dataset/public-washrooms/). The two arena centres are approximate.

The daily import checks the row count against catalogue metadata and retains in-service, mappable entries with a payment zone. It records the City's modification date and the retrieval date separately. Coordinates and visit inputs stay in browser memory. The site builds offline from the committed snapshot. Run `python3 scripts/refresh.py`, `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests`, and `python3 scripts/build.py`. Run `python3 tests/browser_smoke.py` with Chromium and the test dependencies installed.

<!-- schedule-reliability -->
## Schedule reliability

Public GitHub repositories can have scheduled workflows disabled after 60 days of inactivity. A separate weekly [schedule guard](.github/workflows/schedule-guard.yml) calls GitHub's enable-workflow API for an explicit list of refresh workflows and itself. It can restore workflows disabled for inactivity, preserves manually disabled workflows, and runs independently of collection failures.

This is an interim mitigation, not a scheduling guarantee: GitHub does not document active-workflow renewal as a permanent exemption, and scheduled runs can be delayed or dropped. A scheduler on our own Linux server is the planned independent trigger. The guard does not collect data, create dummy commits, or change source/check timestamps; successful collection and published data freshness still need monitoring.
<!-- /schedule-reliability -->
