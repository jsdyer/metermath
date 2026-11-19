"""Keep in-service, mappable City of Vancouver records and all published restrictions."""
from city import dataset, publish

FIELDS = ['object_id','meter_id','mobile_payment_number','local_area','vehicle_type','rate_9am_6pm','rate_6pm_10pm','time_limit_9am_6pm','time_limit_6pm_10pm','time_limit_weekend_9am_6pm','time_limit_weekend_6pm_10pm','time_limit_override','am_rush_hours','pm_rush_hours','prohibition_1_days','prohibition_1_time','prohibition_1_zone','prohibition_2_days','prohibition_2_time','prohibition_2_zone','prohibition_override','flat_rate','meter_head']

def main():
    source, date = dataset('parking-meters')
    rows = []
    for r in source:
        p = r['geo_point_2d']
        if r['service_status'] == 'In Service' and p and r['mobile_payment_number']:
            rows.append([r[k] for k in FIELDS] + [round(p['lon'],6),round(p['lat'],6)])
    if len(rows) < 1000 or len({r[0] for r in rows}) != len(rows):
        raise ValueError('Missing coverage or duplicate source IDs')
    publish({'fields':FIELDS+['lon','lat'],'rows':rows}, {'count':len(rows),'sourceCount':len(source),'latest':date,'zones':len({r[2] for r in rows})})

if __name__ == '__main__':
    main()
