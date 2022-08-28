# fampay

Steps for running the project;

1) clone the repo
2) run npm install
3) run node app.js

Notes:
In App.js

1) line no 9: we can provide any number of api keys here, so if one api keys fails, it will get the data from another one.
2) line no 6: Provide mongodb connection string here.


Steps for testing:

1) GET /search/cricket
This will start fetching latest videos with cricket keywords after each 10 seconds;

2) GET /videos?page=2
This will fetch videos in paginated response, if query param 'page' is not provided then it will return response of first page.

3) GET /title?q=win
This will fetch stored videos with title containing keyword 'win';

4) GET /desc?q=win
This will fetch stored videos with description containing keyword 'win';
