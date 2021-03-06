module.exports = function getFields(settings, currentPage, unusedFields) {
    const request = require('./callApi');
    const getOptions = {
        url: settings.platform + '/rest/organizations/' + settings.orgId + '/sources/page/fields?includeMappings=true&page=' + currentPage + '&perPage=100',
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + settings.apiKey
        }
    }
    request(getOptions, function (err, response, body) {
        if (err) {
            console.log('Err: ', err);
            return;
        }
        if (response.statusCode != 200) {
            console.log(response.statusCode + '-' , body);
            return;
        }

        const fields = JSON.parse(body).items;

        let currentFields = fields.filter(field => field.sources.length < 1);
        currentFields = currentFields.map(field => field.name);
        unusedFields.push(...currentFields);

        if (fields.length == 100) {
            currentPage++;
            getFields(settings, currentPage, unusedFields);
        } else {
            if (unusedFields.length == 0) {
                console.log("No unused fields detected.");
                return;
            }

            const maxFieldsPerRequest = 50;
            for (i = 0; i < unusedFields.length / maxFieldsPerRequest; i++) {
                const currentSlice = unusedFields.slice(i * maxFieldsPerRequest, ((i + 1) * maxFieldsPerRequest)).join(',');
                const deleteOptions = {
                    url: settings.platform + '/rest/organizations/' + settings.orgId + '/sources/fields/batch/delete?fields=' + currentSlice,
                    method: 'DELETE',
                    headers: {
                        Authorization: 'Bearer ' + settings.apiKey
                    }
                }
                request(deleteOptions, function(deleteErr, deleteResponse, deleteBody) {
                    if (deleteErr) {
                        console.log('Error deleting fields: ', deleteErr);
                        return;
                    }
                    if (deleteResponse.statusCode != 204) {
                        console.log('[Field Deletion] ' + deleteResponse.statusCode + ' - ', deleteBody);
                        return;
                    }
                    console.log(`Deleted all ${unusedFields.length} unused field(s).`);
                })
            }
        }
    })
}