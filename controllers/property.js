const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');

const propertyService = require('../services/properties');
const floorService = require('../services/floors');
const apartmentService = require('../services/apartments');
const addressService = require('../services/addresses');
const amenityService = require('../services/amenities');
const imagesService = require('../services/images');
const structuralDetailsService = require('../services/structuralDetails');
const customFiledsService = require('../services/customFields');

/**
 * Function to fetch the properties list
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.getPropertyDetails = async (req, res, next) => {
  try {
    // We will have to replace the finone by findmany below in the future and provide proper where clause
    let property = await propertyService.findOne(() => [{ where: { PropertyID: req.params?.id } }]);

    // Get all image links
    let images = await imagesService.findMany(() => [
      { where: { [Op.or]: [{ LinkedTo: property?.PropertyID }, { ImageID: property?.ThumbnailImage }, { ImageID: property?.MainImage }] } },
    ]);

    // Get the property details
    let details = await structuralDetailsService.findOne(() => [{ where: { DetailsID: property.Details } }]);

    // Get the custom fields for the property
    let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: property.PropertyID } }]);
    if (additionalDetails?.length) {
      additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
    }

    // Get the property address
    let address = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);

    // Get the amenities of the property
    let amenities = await amenityService.findMany(() => [{ where: { ReferenceID: property.PropertyID } }]);

    // Get the image links inside each amenity
    for (let amenity of amenities) {
      // Get all image links
      let amenityImages = await imagesService.findMany(() => [
        {
          where: {
            [Op.or]: [{ LinkedTo: amenity?.AmenityID }],
          },
        },
      ]);
      if (amenityImages.length) {
        amenity.Images = amenityImages;
      }
    }

    res.send({
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      description: details?.Description,
      images,
      additionalFields: additionalDetails,
      amenities,
      address,
      ...details,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the properties list
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.getFullPropertyDetails = async (req, res, next) => {
  try {
    // We will have to replace the finone by findmany below in the future and provide proper where clause
    let property = await propertyService.findOne(() => [{ where: { PropertyID: req.params?.id } }]);

    // Get all image links
    let images = await imagesService.findMany(() => [
      { where: { [Op.or]: [{ LinkedTo: property?.PropertyID }, { ImageID: property?.ThumbnailImage }, { ImageID: property?.MainImage }] } },
    ]);

    // Get the custom fields for the property
    let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: property.PropertyID } }]);
    if (additionalDetails?.length) {
      additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
    }
    // Get the property details
    let details = await structuralDetailsService.findOne(() => [{ where: { DetailsID: property.Details } }]);

    // Get the amenities of the property
    let amenities = await amenityService.findMany(() => [{ where: { ReferenceID: property.PropertyID } }]);

    // Get the floors
    let floors = await floorService.findMany(() => [{ where: { Property: property.PropertyID } }]);

    // Get the property address
    let address = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);

    // Get the apartments and image inside each floor
    for (let floor of floors) {
      let layoutImage = await imagesService.findOne(() => [{ where: { ImageID: floor.LayoutImage } }]);
      floor.layoutImage = layoutImage;
      let apartments = await apartmentService.findMany(() => [{ where: { Floor: floor.FloorID } }]);
      // Iterate through apartment and get the image links and the amenities
      for (let apartment of apartments) {
        // Get the image link
        if (apartment.Image) {
          let image = await imagesService.findOne(() => [{ where: { ImageID: apartment.Image } }]);
          apartment.Image = image;
        }

        // Get the custom fields for the apartment
        let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: apartment.ApartmentID } }]);
        if (additionalDetails?.length) {
          additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
        }
        apartment.additionalFields = additionalDetails;

        // Get the amenities
        let amenities = await amenityService.findMany(() => [{ where: { ReferenceID: apartment.ApartmentID } }]);
        // Get the image links inside each amenity
        for (let amenity of amenities) {
          // Get all image links
          let amenityImages = await imagesService.findMany(() => [
            {
              where: {
                [Op.or]: [{ LinkedTo: amenity?.AmenityID }],
              },
            },
          ]);
          if (amenityImages.length) {
            amenity.Images = amenityImages;
          }
        }
        apartment.amenities = amenities;
      }

      floor.apartments = apartments;
    }

    res.send({
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      description: details.Description,
      additionalFields: additionalDetails,
      images,
      amenities,
      address,
      ...details,
      floors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to add new listing
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.addNewProperty = async (req, res, next) => {
  try {
    let data = req?.body?.data;
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    if (data) {
      // Save the address first and get the ID
      let addressData = {
        Area: data.area,
        Pincode: data.Pincode,
        Latitude: data.Latitude,
        Longitude: data.Longitude,
        Place: data.Place,
        AddressLine1: data.addressLine1,
        AddressLine2: data.addressLine2,
        GoogleMapLink: data.googleMapLink,
      };
      if (data?.addressId) {
        addressData.AddressID = data.addressId;
      }
      let address = await addressService.create(addressData);

      let propertyData = {
        PropertyName: data.propertyName,
        Owner: user,
        ThumbnailImage: data.thumbnailImage,
        MainImage: data.mainImage,
        Address: address.AddressID,
        Draft: true,
      };
      if (data?.propertyId) {
        propertyData.PropertyID = data.propertyId;
      }
      let property = await propertyService.create(propertyData);

      // Delete the exsisiting images
      let images = await imagesService.findMany(() => [{ where: { LinkedTo: property.PropertyID } }]);
      let imagesToBeDeleted = images.filter((image) => !data.images.includes(image.ImageID)).map((image) => image.ImageID);
      await imagesService.deleteRow({ where: { ImageID: { [Op.in]: imagesToBeDeleted } } });

      // link the rest of images to the property
      for (let image of data.images) {
        let imageData = {
          LinkedTo: property.PropertyID,
        };
        await imagesService.create({ ...imageData, ImageID: image });
      }

      let activeFloorIds = [];
      // Save the floor details
      for (let floor of data?.floors) {
        floorData = {
          FloorName: floor?.floorName ?? '',
          UnitCount: floor?.units ?? 0,
          LayoutImage: floor?.layoutImage ?? null,
          Property: property.PropertyID,
        };
        if (floor?.FloorID) {
          floorData.FloorID = floor.FloorID;
        }
        floorData = await floorService.create(floorData);
        activeFloorIds.push(floorData.FloorID);
      }

      // delete the unwanted floors
      await floorService.deleteRow({
        where: {
          Property: property.PropertyID,
          FloorID: {
            [Op.notIn]: activeFloorIds,
          },
        },
      });

      res.status(200).send(property.PropertyID);
    } else {
      res.status(400).send('Invalid Data send');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to add General details for property
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.addPropertyGeneralDetails = async (req, res, next) => {
  try {
    let data = req?.body?.data;
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    if (data) {
      // Iterate through each floor
      for (let floor of data?.floors) {
        // let floorData = await floorService.findOne(() => [{ where: { FloorID: floor.id } }]);
        let property = data.propertyId;

        let activeApartments = [];
        // We have to update the unit count for the floor
        await floorService.create({ UnitCount: floor?.layout?.length ?? 0, FloorID: floor.id });

        // Iterate through apartments in each floor
        for (let [index, apartment] of floor?.layout?.entries()) {
          let apartmentData = {
            Property: property,
            Floor: floor.id,
            LayoutIndex: index,
            ApartmentName: apartment.name,
            Image: apartment?.Image ?? null,
            Price: apartment?.Price ?? 0,
          };
          if (apartment.id) {
            apartmentData.ApartmentID = apartment.id;
          }
          apartmentData = await apartmentService.create(apartmentData);
          activeApartments.push(apartmentData.ApartmentID);

          // delete all the additional fields added earlier for this apartment
          await customFiledsService.deleteRow({
            where: {
              LinkedTo: apartmentData.ApartmentID,
            },
          });

          // save each additional field
          if (apartment?.additionalFields && Object.keys(apartment.additionalFields)?.length) {
            for (let field in apartment.additionalFields) {
              await customFiledsService.create({
                LinkedTo: apartmentData.ApartmentID,
                FieldName: field,
                FieldValue: apartment.additionalFields[field],
              });
            }
          }

          let wantedAmenities = [];

          // save each amenity
          for (let amenity of apartment.amenities) {
            let amenityData = {
              AmenityType: amenity.name,
              Number: amenity.number,
              ReferenceID: apartmentData.ApartmentID,
              // Image: amenity.image,
            };
            if (amenity.id) {
              amenityData.AmenityID = amenityData.id;
            }
            amenityData = await amenityService.create(amenityData);
            wantedAmenities.push(amenityData.AmenityID);

            // Delete the exsisiting images
            let images = await imagesService.findMany(() => [{ where: { LinkedTo: amenityData.AmenityID } }]);
            let imagesToBeDeleted = images.filter((image) => !amenity.images.includes(image.ImageID)).map((image) => image.ImageID);
            await imagesService.deleteRow({ where: { ImageID: { [Op.in]: imagesToBeDeleted } } });

            // link the images to the amenity
            for (let image of amenity.images) {
              let imageData = {
                LinkedTo: amenityData.AmenityID,
              };
              await imagesService.create({ ...imageData, ImageID: image });
            }
          }
          // delete the unwanted amneities
          await amenityService.deleteRow({
            where: {
              ReferenceID: apartmentData.ApartmentID,
              AmenityID: {
                [Op.notIn]: wantedAmenities,
              },
            },
          });
        }

        // delete the unwanted apartments
        await apartmentService.deleteRow({
          where: {
            Property: property,
            Floor: floor.id,
            ApartmentID: {
              [Op.notIn]: activeApartments,
            },
          },
        });
      }

      // save the property details from excel
      if (data?.property) {
        await addPropertyDetails(data.property);
      }
      res.status(200).send('Done');
    } else {
      res.status(400).send('Invalid Data send');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to add additional details for property
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.addPropertyAdditionalDetails = async (req, res, next) => {
  try {
    let data = req?.body?.data;
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    if (data) {
      await addPropertyDetails(data);
      await propertyService.create({ Draft: false, PropertyID: data.propertyId });

      res.status(200).send('Done');
    } else {
      res.status(400).send('Invalid Data send');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

const addPropertyDetails = async (data) => {
  try {
    let structuralDetails = {
      Description: data.description,
      AgeOfBuilding: data.AgeOfBuilding,
      HouseType: data?.HouseType ?? null,
      PropertyType: data.PropertyType,
      YearOfConstructionOrPeriod: data.YearOfConstructionOrPeriod,
    };
    if (data.detailsId) {
      structuralDetails.DetailsID = data.detailsId;
    } else {
      // check if this property already has details
      let property = await propertyService.findOne(() => [{ where: { PropertyID: data.propertyId } }]);
      if (property?.Details) {
        structuralDetails.DetailsID = property.Details;
      }
    }
    structuralDetails = await structuralDetailsService.create(structuralDetails);

    // delete all the additional fields added earlier for this property
    await customFiledsService.deleteRow({
      where: {
        LinkedTo: data.propertyId,
      },
    });

    // save each additional field
    if (data?.additionalFields && Object.keys(data.additionalFields)?.length) {
      for (let field in data.additionalFields) {
        await customFiledsService.create({
          LinkedTo: data.propertyId,
          FieldName: field,
          FieldValue: data.additionalFields[field],
        });
      }
    }

    let address;
    if (data.address) {
      let addressData = {
        Area: data.address.Area,
        Pincode: data.address.Pincode,
        Latitude: data.address.Latitude,
        Longitude: data.address.Longitude,
        Place: data.address.Place,
        AddressLine1: data.address.AddressLine1,
        AddressLine2: data.address.AddressLine2,
        GoogleMapLink: data.address.GoogleMapLink,
      };
      if (data.address?.AddressID) {
        addressData.AddressID = data.address.AddressID;
      }
      address = await addressService.create(addressData);
    }

    // Link the details to the property and change the draft status
    await propertyService.create({
      Details: structuralDetails.DetailsID,
      PropertyID: data.propertyId,
      ...(address?.AddressID ? { Address: address.AddressID } : {}),
    });
  } catch (error) {
    console.error(error);
  }
};

/**
 * Function to upload a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */

exports.convertExcel = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }

    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadedFile = req.files.document;
    const fileName = uploadedFile.name;
    const uploadPath = `${__dirname}/../uploads/tmp/documents/${uuidv4()}`;

    fs.mkdirSync(uploadPath, { recursive: true }); // Create the directory if it doesn't exist

    const fileFullPath = `${uploadPath}/${fileName}`;

    uploadedFile.mv(fileFullPath, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
      const result = excelToJson({
        sourceFile: fileFullPath,
        header: {
          // Is the number of rows that will be skipped and will not be present at our result object. Counting from top to bottom
          rows: 1, // 2, 3, 4, etc.
        },
        columnToKey: {
          '*': '{{columnHeader}}',
        },
      });
      res.status(200).send(result);
      fs.rmdirSync(uploadPath, { recursive: true, force: true });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to download the template Excel
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.downloadExcelTemplate = async (req, res, next) => {
  try {
    const uploadPath = `${__dirname}/../excel_template.xlsx`;
    res.download(uploadPath, 'template.xlsx', (err) => {
      if (err) {
        // Handle any errors that may occur during the download
        console.error('File download error:', err);
        res.status(500).send('File download failed');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
