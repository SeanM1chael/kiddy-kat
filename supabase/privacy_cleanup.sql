-- =====================================================================
-- Step 48: 🔒 Privacy cleanup (one time)
-- Before version 2026-11-05d, each phone copied two things online that
-- should stay on the phone: the grown-up settings PIN (as typed) and the
-- kid's birth year. The new app stops sending them. This removes the old
-- copies already saved, and puts the age group in place of the birth year.
-- Run it AFTER every family phone shows version 2026-11-05d or newer.
-- Safe to run more than once.
-- =====================================================================
update kid_data d
set data = (d.data - 'kiddyKatParentPin')
           || case when safe_jsonb(d.data->>'kiddyKatProfile') ? 'birthYear'
                   then jsonb_build_object('kiddyKatProfile',
                          ((safe_jsonb(d.data->>'kiddyKatProfile') - 'birthYear')
                           || jsonb_build_object('ageGroup', k.animal))::text)
                   else '{}'::jsonb end
from kids k
where k.id = d.kid_id
  and (d.data ? 'kiddyKatParentPin' or safe_jsonb(d.data->>'kiddyKatProfile') ? 'birthYear');

-- Check: both numbers should be 0
select count(*) filter (where data ? 'kiddyKatParentPin') as pins_left,
       count(*) filter (where safe_jsonb(data->>'kiddyKatProfile') ? 'birthYear') as birth_years_left
from kid_data;
